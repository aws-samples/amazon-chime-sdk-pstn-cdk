/*
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: MIT-0
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this
 * software and associated documentation files (the "Software"), to deal in the Software
 * without restriction, including without limitation the rights to use, copy, modify,
 * merge, publish, distribute, sublicense, and/or sell copies of the Software, and to
 * permit persons to whom the Software is furnished to do so.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
 * INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
 * PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
 * HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
 * OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
 * SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */


/* Sample Chime SDK PSTN Application

This is an example application.  It answers the phone.  If your phone number has not
called before it will read out your phone number to you and then tell you the time
in UTC.  If you have called before it just tells you the time.

This application uses one SIP Media Appliance (SMA), one SIP Rule, and one Phone Number.
It uses S3, DynamoDB, Lambda, and Polly services.
*/

const AWS = require('aws-sdk');

const REGION = process.env.REGION;
const wavFileBucket = process.env["WAVFILE_BUCKET"];
const callInfoTable = process.env["CALLINFO_TABLE_NAME"];

const s3 = new AWS.S3();
const polly = new AWS.Polly({ signatureVersion: "v4", region: REGION, });
const tc = new AWS.TranscribeService({ signatureVersion: "v4", region: REGION, });
var documentClient = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event, context, callback) => {
  console.log(JSON.stringify(event));
  let actions;

  switch (event.InvocationEventType) {
    case "NEW_INBOUND_CALL":
      actions = await newCall(event);
      break;

    case "ACTION_SUCCESSFUL":
      actions = [hangupAction];
      break;

    case "HANGUP":
      actions = [];
      break;

    case "CALL_ANSWERED":
      actions = [];
      break;

    default:
      actions = [hangupAction];
  }
  const response = {
    SchemaVersion: "1.0",
    Actions: actions,
  };
  callback(null, response);
};

async function newCall(event) {
  console.log({ event });
  const from = event.CallDetails.Participants[0].From;
  const callid = event.CallDetails.Participants[0].CallId;
  const start = event.CallDetails.Participants[0].StartTimeInMilliseconds;
  const keybase = "welcome.wav"

  console.log(from, callid, start);

  if (!from) {
    console.log("failed to parse from number");
    return [hangupAction];
  }

  const d = new Date();
  const h = d.getHours();
  const m = d.getMinutes();
  const hour = pad(h, 2);
  const min = pad(m, 2);

  let phrase = "";
  const key = callid.toString() + "-" + keybase;

  const timePhrase = "The time is <break/><prosody rate=\"slow\">" + hour + "<break/>" + min + "</prosody><break/>U T C<break/>"
  const goodbyePhrase = "Goodbye!</speak>";

  const knownCaller = await getCaller(from);
  if (knownCaller) {
    const welcomeBackPhrase = "<speak><break/>Welcome back!<break/>";
    phrase += welcomeBackPhrase + timePhrase + goodbyePhrase;
    console.log(event.CallDetails.Participants)
    putCaller(from, callid, start);
  } else {
    const welcomePhrase = "<speak><break/>Welcome!";
    const phoneNumberPhrase = "You are calling from <prosody rate=\"slow\"><say-as interpret-as=\"characters\">" + from + "</say-as></prosody><break/>";
    phrase += welcomePhrase + phoneNumberPhrase + timePhrase + goodbyePhrase;
    console.log(event.CallDetails.Participants)
    putCaller(from, callid, start);
  }
  console.log("phrase is " + phrase);
  try {
    await synthesizeWelcomeSpeech(phrase, key);
  }
  catch (error) {
    console.log(error);
    return [hangupAction];
  }
  playAudioAction.Parameters.AudioSource.Key = key;
  return [playAudioAction];
}

const hangupAction = {
  Type: "Hangup",
  Parameters: {
    SipResponseCode: "0",
    ParticipantTag: "",
  },
};

const playAudioAction = {
  Type: "PlayAudio",
  Parameters: {
    AudioSource: {
      Type: "S3",
      BucketName: wavFileBucket,
      Key: "",
    },
  },
};

const pauseAction = {
  Type: "Pause",
  Parameters: {
    DurationInMilliseconds: "1000",
  },
};



/* ************************************************************************************

The following functions are support funtions and can be used as-is.

*************************************************************************************** */


function pad(num, size) {
  num = num.toString();
  while (num.length < size) num = "0" + num;
  return num;
}

async function synthesizeWelcomeSpeech(phrase, s3Key) {
  console.log("phrase: ", phrase, " s3Key: ", s3Key);

  let audioBuffer = '';
  let audioBuffer2 = '';

  try {
    audioBuffer = await synthesizeSpeechInternal(phrase, 'ssml', 'Joanna', 'en-US');
  } catch (error) {
    console.log(error);
    return null;
  }
  if (audioBuffer) {
    try {
      audioBuffer2 = await addWaveHeaderAndUploadToS3(audioBuffer, wavFileBucket, s3Key);
    } catch (error) {
      console.log(error);
      return null;
    }
  } else { return null; }

  if (audioBuffer2) {
    return audioBuffer2;
  }
  return null;
};

async function putCaller(phoneNumber, id, startTime) {
  var params = {
    TableName: callInfoTable,
    Item: {
      phoneNumber: phoneNumber,
      id: id,
      startTime: startTime,
    },
  };

  try {
    const results = await documentClient.put(params).promise();
    console.log(results);
    return results;
  } catch (err) {
    console.log(err);
    return err;
  }
}

async function getCaller(phonenumber) {
  console.log("getCaller: " + phonenumber);
  var params = {
    TableName: callInfoTable,
    Key: { phoneNumber: phonenumber },
  };

  console.log(params);
  try {
    const results = await documentClient.get(params).promise();
    console.log("database results: ", results);
    if (results.Item.phoneNumber == phonenumber) {
      console.log(results);
      return true;
    } else {
      console.log("Phone number not found");
      return false;
    }
  } catch (err) {
    console.log(err);
    console.log("Error looking for phone number");
    return false;
  }
}

async function getS3Data(s3Bucket, s3Key) {
  let s3params = {
    Bucket: s3Bucket,
    Key: s3Key
  };

  let s3Object;
  try {
    s3Object = await s3.getObject(s3params).promise();
  } catch (error) {
    console.log(error);
    return null;
  }
  return s3Object.Body;
}

async function synthesizeSpeechInternal(text, textType, voiceID, languageCode) {
  let pollyparams = {
    'Text': text,
    'TextType': textType,
    'OutputFormat': 'pcm',
    'SampleRate': '8000',
    'VoiceId': voiceID,
    'LanguageCode': languageCode
  };

  var pollyResult;
  try {
    pollyResult = await polly.synthesizeSpeech(pollyparams).promise();
  } catch (error) {
    console.log(error);
    return null;
  }
  if (pollyResult.AudioStream.buffer) {
    return pollyResult.AudioStream.buffer;
  }
  else {
    return null;
  }
}

async function addWaveHeaderAndUploadToS3(audioBuffer, s3Bucket, s3Key) {
  var uint16Buffer = new Uint16Array(audioBuffer);

  var wavArray = buildWaveHeader({
    numFrames: uint16Buffer.length,
    numChannels: 1,
    sampleRate: 8000,
    bytesPerSample: 2
  });

  var totalBuffer = _appendBuffer(wavArray, audioBuffer);
  return await uploadAnnouncementToS3(s3Bucket, s3Key, totalBuffer);
};

async function uploadAnnouncementToS3(s3Bucket, s3Key, totalBuffer) {
  var buff = Buffer.from(totalBuffer);

  let s3params = {
    Body: buff,
    Bucket: s3Bucket,
    Key: s3Key,
    ContentType: 'audio/wav'
  };

  return s3.upload(s3params).promise();
};


function buildWaveHeader(opts) {
  var numFrames = opts.numFrames;
  var numChannels = opts.numChannels || 2;
  var sampleRate = opts.sampleRate || 44100;
  var bytesPerSample = opts.bytesPerSample || 2;
  var blockAlign = numChannels * bytesPerSample;
  var byteRate = sampleRate * blockAlign;
  var dataSize = numFrames * blockAlign;

  var buffer = new ArrayBuffer(44);
  var dv = new DataView(buffer);

  var p = 0;

  function writeString(s) {
    for (var i = 0; i < s.length; i++) {
      dv.setUint8(p + i, s.charCodeAt(i));
    }
    p += s.length;
  }

  function writeUint32(d) {
    dv.setUint32(p, d, true);
    p += 4;
  }

  function writeUint16(d) {
    dv.setUint16(p, d, true);
    p += 2;
  }

  writeString('RIFF');              // ChunkID
  writeUint32(dataSize + 36);       // ChunkSize
  writeString('WAVE');              // Format
  writeString('fmt ');              // Subchunk1ID
  writeUint32(16);                  // Subchunk1Size
  writeUint16(1);                   // AudioFormat
  writeUint16(numChannels);         // NumChannels
  writeUint32(sampleRate);          // SampleRate
  writeUint32(byteRate);            // ByteRate
  writeUint16(blockAlign);          // BlockAlign
  writeUint16(bytesPerSample * 8);  // BitsPerSample
  writeString('data');              // Subchunk2ID
  writeUint32(dataSize);            // Subchunk2Size

  return buffer;
}

var _appendBuffer = function (buffer1, buffer2) {
  var tmp = new Uint8Array(buffer1.byteLength + buffer2.byteLength);
  tmp.set(new Uint8Array(buffer1), 0);
  tmp.set(new Uint8Array(buffer2), buffer1.byteLength);
  return tmp;
};


