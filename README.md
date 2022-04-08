[![codecov](https://codecov.io/gh/time-loop/cdk-jump-box/branch/master/graph/badge.svg?token=QEPjE3ysnM)](https://codecov.io/gh/time-loop/cdk-jump-box)

# cdk-jump-box

## Connecting

First you'll need to do the bootstrapping steps described below.

```bash
STACK_NAME="MyStack"
ASG_NAME="${STACK_NAME}Jump"

SSH_KEY_NAME="$HOME/.ssh/${AWS_PROFILE}-${ASG_NAME}.pem"

# Set us up the Jumpbox
aws autoscaling set-desired-capacity --auto-scaling-group-name "$ASG_NAME" --desired-capacity 1

# Find the jump box instance
while
  JUMP_INSTANCE_ID=$(aws autoscaling describe-auto-scaling-groups --query "AutoScalingGroups[?AutoScalingGroupName=='$ASG_NAME'].Instances[].InstanceId" --output=text)
  [[ -z "$JUMP_INSTANCE_ID" ]];
do
  sleep 10
done

LOCAL_PORT=$(python -c 'import socket; s=socket.socket(); s.bind(("", 0)); print(s.getsockname()[1]); s.close()')

ssh -f -i "$SSH_KEY" -L "$LOCAL_PORT:$INTERNAL_HOST:$INTERNAL_PORT" "ec2-user@$JUMP_INSTANCE_ID" sleep 10 && \
exampleClient --host localhost --port "$LOCAL_PORT" ...
```

## Bootstrapping

You only have to run these steps once, but you need to do it before you try connecting.

1. [Install](https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-working-with-install-plugin.html) the session manager plugin:

```bash
curl "https://s3.amazonaws.com/session-manager-downloads/plugin/latest/mac/sessionmanager-bundle.zip" -o "sessionmanager-bundle.zip"
unzip sessionmanager-bundle.zip

# use python3 instead of python2 on your mac
python3 sessionmanager-bundle/install
```

2. Make sure the following is in your `~/.ssh/config`:

```
# SSH over Session Manager
Host i-* mi-*
  ProxyCommand sh -c "aws ssm start-session --target %h --document-name AWS-StartSSHSession --parameters 'portNumber=%p'"
```

3. Get the SSH key such as `~/.ssh/myAccount-MyStackJump.pem`:

```bash
export AWS_PROFILE=myAccount
export AWS_REGION=us-west-2
click a

STACK_NAME="MyStack"
ASG_NAME="${STACK_NAME}Jump"

# Fetch the SSH key from SecretsManager
SSH_KEY_NAME="$HOME/.ssh/${AWS_PROFILE}-${ASG_NAME}.pem"
aws secretsmanager get-secret-value --region="$AWS_REGION" --output=text --query SecretString --secret-id "ec2-ssh-key/${ASG_NAME}/private" > "$SSH_KEY_NAME"
chmod 400 "$SSH_KEY_NAME"
```
