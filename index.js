const { SFNClient, StartExecutionCommand } = require("@aws-sdk/client-sfn");

const sfnClient = new SFNClient({ region: process.env.AWS_REGION });
const STATE_MACHINE_ARN = process.env.STATE_MACHINE_ARN;

exports.handler = async (event) => {
    console.log("Lex event received:", JSON.stringify(event, null, 2));

    const intentName = event.sessionState.intent.name;
    const slots = event.sessionState.intent.slots;
    
    // Default to a 'PERFORMANCE' test type if not specified
    let testType = "PERFORMANCE"; 
    if (intentName === 'RunChaosTest') {
        testType = "CHAOS";
    }

    const sfnInput = {
        testType: testType,
        // Future enhancement: Pass parameters from Lex slots
        // e.g., users: slots.userCount?.value?.interpretedValue || '100'
    };

    const command = new StartExecutionCommand({
        stateMachineArn: STATE_MACHINE_ARN,
        input: JSON.stringify(sfnInput),
    });

    try {
        await sfnClient.send(command);
        console.log("State machine execution started successfully.");
        
        // Respond to Lex that the request was successful
        return {
            sessionState: {
                dialogAction: { type: 'Close' },
                intent: { name: intentName, state: 'Fulfilled' }
            },
            messages: [{ contentType: 'PlainText', content: `OK, I've started the ${testType.toLowerCase()} test for you.` }]
        };
    } catch (error) {
        console.error("Error starting state machine:", error);
        return {
            sessionState: {
                dialogAction: { type: 'Close' },
                intent: { name: intentName, state: 'Failed' }
            },
            messages: [{ contentType: 'PlainText', content: "Sorry, I couldn't start the test. Please check the system logs." }]
        };
    }
};