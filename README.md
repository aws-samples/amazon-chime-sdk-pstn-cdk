# Amazon Chime SDK PSTN CDK Template 

This repo holds a template for a Chime SDK PSTN application that uses the [AWS Cloud Development Kit (CDK)](https://aws.amazon.com/cdk/) to automatically manage application
deployment lifecycle. It includes a sample application in the "src" folder suitable to understand how to develop your own application. 

In github you can directly create a new repo from here by clicking the green "Use this Template" button, making it easy to use this template to experiment with the Chime SDK.
You  choose a different name for your new repo, but it will start with a complete copy of this template. NOTE:  you cannot push changes to the common elements back upstream to this template repo.  
Once you "Use this Template" you have a new stand-alone repo that is the basis of your own sample application.  If you desire to contribute to this template, you can clone it directly 
from the command line (see below).

## What does it Do?

This sample app is an example of a Chime SDK telephony application.  It has both the "Infrastructure as Code" and the Application code.  It deploys an AWS allocated 
[Phone Number](https://docs.aws.amazon.com/chime/latest/ag/phone-numbers.html), creates and configures a [SIP Media Application (SMA)](https://docs.aws.amazon.com/chime/latest/ag/use-sip-apps.html) 
and a [SIP Rule](https://docs.aws.amazon.com/chime/latest/ag/manage-sip-applications.html).  It then creates a simple IVR application that answers calls to 
the provisioned phone number and tells you the time (in UTC) and then hangs up.  If you have never called the app before, it reads back the
 phone number you are calling from.  Your phone number is stored in a DynamoDB database.  This app is a bare-bones example, but it illustrates how to build Chime SDK applications including detecting
 the number called from, checking if it's a known number, and using [Amazon Polly](https://aws.amazon.com/polly/) to create the voice prompt played back to the caller.
## Installing Dependencies

On a clean linux instance, you need to install the [AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html), [jq](https://stedolan.github.io/jq/download/) and 
the [Node Version Manager (nvm)](https://github.com/nvm-sh/nvm).  You can then use nvm to install the other dependendencies, like this:

```bash
nvm install 16 # installs Nodejs 16
nvm use 16 # selects it
npm install -g npm nodejs typescript aws-sdk aws-cdk # installs the necessary modules
```

An example of the commands to install on Amazon Linux (or other yum-based linux) is [here](SETUP-DEPS.md).  However, please
always reference those tools installation instructions if needed.
## Configuring your AWS Account

You need to configure your [AWS Account parameters](https://docs.aws.amazon.com/cli/latest/userguide/cli-chap-configure.html) to enable deploying the application.  The easiest way
to ensure that you have it configured properly is to run:

```bash
aws sts get-caller-identity
```

You should get information about your valid AWS account.  

**Note:** Deploying this demo application will cause your AWS Account to be billed for services, including the Amazon Chime SDK, 
used by the application.

## Batteries Included, Just Show Me Already!

Once you have installed the dependencies, if you just want to go for it you can run the "deploy.sh" script.  It will call the make commands to deploy the sample app.  It's output will 
include the application telephone number:

```bash
./deploy.sh
```

## Output

You will get something like this:

```bash
ChimeSdkPstnCdkStack.chimeProviderLog = /aws/lambda/ChimeSdkPstnCdkStack-chimeSdkPstnProviderLambaEA22-SPQgqjzDXXKU
ChimeSdkPstnCdkStack.chimeSdkPstnInfoTable = ChimeSdkPstnCdkStack-callInfo84B39180-2I04GUDXX08K
ChimeSdkPstnCdkStack.inboundPhoneNumber = ***** PHONE NUMBER HERE *****
ChimeSdkPstnCdkStack.lambdaARN = arn:aws:lambda:us-west-2:<account number>:function:ChimeSdkPstnCdkStack-ChimeSdkPstnLambda94XXE76E-qxK8wkKqOrLV
ChimeSdkPstnCdkStack.lambdaLayerArn = arn:aws:lambda:us-west-2:<account number>:layer:appLambdaLayer43XXEA22:27
ChimeSdkPstnCdkStack.lambdaLog = /aws/lambda/ChimeSdkPstnCdkStack-ChimeSdkPstnLambda94B9E76E-qxK8wkKqOrLV
ChimeSdkPstnCdkStack.phoneID = <PHONE ID>
ChimeSdkPstnCdkStack.region = us-west-2
ChimeSdkPstnCdkStack.sipRuleID = cb75d4b4-bc12-47a0-9f91-e0e79136dbce
ChimeSdkPstnCdkStack.sipRuleName = ChimeSdkPstnCdkStack
ChimeSdkPstnCdkStack.smaID = f162968d-e771-476b-8a4d-dcd976e20e8b

Stack ARN:
arn:aws:cloudformation:us-west-2:<account number>:stack/ChimeSdkPstnCdkStack/919XXe80-4712-11ec-9694-02afe776b4ef
```

All you need is the phone number on the line "ChimeSdkPstnCdkStack.inboundPhoneNumber."  Call that number and the app will respond.

## Customizing For Your Own Use

This CDK script will create a stack named ChimeSdkPstnCdkStack.  Since the outputs of a stack must be unique across the region that the stack is deployed to
you can change the stack name to enable deploying it more than once.  To make it easier for you to do this, copy and paste this snip to the command line 
and replace NEWNAME with your new application stack name:

```bash
export REPLACEMENT='NEWNAME'
sed -i "s/ChimeSdkPstnCdkStack/$REPLACEMENT/g" ./lib/chime_sdk_pstn_cdk-stack.ts ./bin/chime_sdk_pstn_cdk.ts
```
This will replace the name in all locations in the needed files with the new stack name.
## Details and In-Depth Instructions

This section of the README is for information only, and is not needed to just deploy and run the sample application.
### AWS CDK

There are three parts to this repo: the CDK automation scripting (in the 'lib' folder), the actual sample application itself (in the 'src' folder, and a CloudFormation Custom Resource Provider (in a parallel folder).
Please refer to [those docs](https://github.com/aws-samples/amazon-chime-sdk-pstn-provider) for more information.
### Custom Provider

This repo requires a parallel repo that contains the [amazon-chime-sdk-pstn-provider](https://github.com/aws-samples/amazon-chime-sdk-pstn-provider) Custom Resource Provider. This may eventually move to become a git submodule, 
but today the code expects it to be parallel to this repo. If you have placed it in a different folder location, you can make the change in ```lib/chime_sdk_pstn_cdk-stack.ts``` to make it work:

```typescript
// default custom provider is in a parallel folder
// keeping it separate so that it can evolve independently
const chimeSdkPstnProviderDir = `${path.resolve(
  __dirname
)}/../../amazon-chime-sdk-pstn-provider`;
const ChimeSdkPstnProviderHandler = "index.handler";
```

Today the custom provider currently only supports the creation of one Phone Number, one SMA, and one SIP Rule.  Please see the [detailed documentation](https://github.com/aws-samples/amazon-chime-sdk-pstn-provider)
in that repo for more information.
### Example Application

The sample app is in the 'src' directory and is vanilla javascript. The CDK code is in typescript.  To prevent the CDK from trying to treat the application code as typescript we 
specifically excluded the app from the tsc build process via the top level tsconfig.json file:

```json
 "exclude": [
    "node_modules",
    "cdk.out",
    "src"
  ]
```
### Cloud Development Kit (CDK) 

The CDK script is located in the ```lib``` folder.  More information on the CDK is available [here](https://aws.amazon.com/cdk/);

### Makefile

This repo makes use of ```make``` and the Makefile is a handy way to handle dependencies and chain outputs to inputs. You are encouraged to read the commands in the 
[Makefile](https://github.com/aws-samples/amazon-chime-sdk-pstn-cdk/blob/main/Makefile) to understand what commands are available and how they work.  We make
heavy use of the command line JSON tool [jq](https://stedolan.github.io/jq/) to enable simple automation for many commands.
### Node Modules

The Makefile will handle downloading all necessary node modules for you. If you want to trigger that manually you can:

```bash
make modules-install
```
### Depoloying to Your AWS Account

You can manually deploy the sample application using the SDK with the following command:

```bash
make deploy
```
### Cleanup 

You can clean up everything and remove all resources that this demo allocation with the following command:

```
make destroy
```
### Other Helper Make Commands

#### Testing the Lambda Function

To test if the application deployed properly and is responding, you can invoke the lambda function directly (bypassing the SIP Media Application) 
with the following command:

```bash
make invoke
```
This will use the file "test/in.json" as a sample input to the function. This is useful to ensure that your code is actually invoking properly with no javascript errors.
You should get an output that looks like this:

```bash
make invoke
arn:aws:lambda:us-west-2:<account number>:function:ChimeSdkPstnCdkStack-ChimeSdkPstnLambda94B9E76E-x5sxFOqrRzgm
jq . ./test/in.json
{
  "SchemaVersion": "1.0",
  "Sequence": 1,
  "InvocationEventType": "NEW_INBOUND_CALL",
  "CallDetails": {
    "TransactionId": "transaction-id",
    "AwsAccountId": "aws-account-id",
    "AwsRegion": "us-east-1",
    "SipRuleId": "sip-rule-id",
    "SipApplicationId": "sip-application-id",
    "Participants": [
      {
        "CallId": "call-id-1",
        "ParticipantTag": "LEG-A",
        "To": "+11234567890",
        "From": "+19876543210",
        "Direction": "Inbound",
        "StartTimeInMilliseconds": "159700958834234",
        "Status": "Connected"
      }
    ]
  }
}
aws lambda invoke --function-name "arn:aws:lambda:us-west-2:<account number>:function:ChimeSdkPstnCdkStack-ChimeSdkPstnLambda94B9E76E-x5sxFOqrRzgm" --cli-binary-format raw-in-base64-out --payload file://./test/in.json ./out/out.json --no-paginate 2>&1 > /dev/null
jq . ./out/out.json
{
  "SchemaVersion": "1.0",
  "Actions": [
    {
      "Type": "PlayAudio",
      "Parameters": {
        "AudioSource": {
          "Type": "S3",
          "BucketName": "chimesdkpstncdkstack-wavfiles98e3397d-mlvloqhnp0l8",
          "Key": "call-id-1-welcome.wav"
        }
      }
    }
  ]
}
```
This is an excellent example of using the jq tool on the output of some commands to provide the data for inputs for other commands.

#### Seeing the Application Logs in your Terminal

If you want to see the logs from the sample application in your console, you can use this command:

```
make logs
```

These update fairly slowly so be patient and wait 30 seconds if you think it's not working.  You should see output that looks something like this:

```bash
2021-11-19T13:54:10 2021-11-19T13:54:10.174Z	12fb72f7-60e5-41ce-8cd4-1df8ebad05d7	INFO	phrase is <speak><break/>Welcome!You are calling from <prosody rate="slow"><say-as interpret-as="characters">+19876543210</say-as></prosody><break/>The time is <break/><prosody rate="slow">13<break/>54</prosody><break/>U C T<break/>Goodbye!</speak>
2021-11-19T13:54:10 2021-11-19T13:54:10.174Z	12fb72f7-60e5-41ce-8cd4-1df8ebad05d7	INFO	phrase:  <speak><break/>Welcome!You are calling from <prosody rate="slow"><say-as interpret-as="characters">+19876543210</say-as></prosody><break/>The time is <break/><prosody rate="slow">13<break/>54</prosody><break/>U C T<break/>Goodbye!</speak>  s3Key:  call-id-1-welcome.wav
2021-11-19T13:54:10 2021-11-19T13:54:10.275Z	12fb72f7-60e5-41ce-8cd4-1df8ebad05d7	INFO	{}
2021-11-19T13:54:10 END RequestId: 12fb72f7-60e5-41ce-8cd4-1df8ebad05d7
2021-11-19T13:54:10 REPORT RequestId: 12fb72f7-60e5-41ce-8cd4-1df8ebad05d7	Duration: 1577.26 ms	Billed Duration: 1578 ms	Memory Size: 128 MB	Max Memory Used: 81 MB	Init Duration: 478.68 ms
```
NOTE:  that phone number is not real.
#### Clearing Call Records from DynamoDB

You can clear call records from the database by:

```bash
make cleardb
```

This will remove all records of calls from the DynamoDB table.  You should see output that looks something like this:

```bash
make cleardb
number=1 ; while [[ $number -le 1 ]] ; do \
		aws dynamodb delete-item --table-name "ChimeSdkPstnCdkStack-callInfo84B39180-J1S9WZDBFUNM" --key ' {   "phoneNumber": {     "S": "+19876543210"   } }' ; echo $number ; ((number = number + 1)) ; \
	done
1
```

NOTE:  that phone number is not real.

## Disclaimers

Deploying the Amazon Chime SDK demo application contained in this repository will cause your AWS Account to be billed for services, including the Amazon Chime SDK, used by the application.

The voice prompt audio files and database records created in this demo are not encrypted, as would be recommended in a production-grade application.  
## Security

See [CONTRIBUTING](CONTRIBUTING.md#security-issue-notifications) for more information.

## License

This library is licensed under the MIT-0 License. See the LICENSE file.

Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
SPDX-License-Identifier: MIT-0

