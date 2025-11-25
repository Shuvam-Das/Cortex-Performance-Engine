const { SSMClient, sendCommand } = require("@aws-sdk/client-ssm");
const { createLogger } = require('../common/logger');

const ssm = new SSMClient({});

exports.handler = async (event) => {
    const { correlationId, chaosType, target, duration } = event;
    const logger = createLogger('chaos-agent', correlationId);

    logger.info({ chaosType, target, duration }, 'Chaos Agent starting.');

    let documentName;
    switch (chaosType) {
        case 'CPU_STRESS':
            documentName = 'AWS-RunShellScript';
            // This is a simplified example. In a real scenario, you'd use more robust chaos tools.
            parameters = { commands: [`stress --cpu 1 --timeout ${duration}`] };
            break;
        // Add cases for LATENCY, ERROR_INJECTION, etc.
        default:
            logger.warn({ chaosType }, 'Unsupported chaos type requested.');
            return { status: 'SKIPPED', reason: 'Unsupported chaos type' };
    }

    await ssm.send(new sendCommand({
        DocumentName: documentName,
        InstanceIds: [target], // The EC2 instance ID of the web app
        Parameters: parameters,
    }));

    logger.info(`Successfully initiated ${chaosType} chaos experiment.`);
    return { status: 'SUCCESS' };
};