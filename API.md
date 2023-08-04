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

# API Reference <a name="API Reference" id="api-reference"></a>

## Constructs <a name="Constructs" id="Constructs"></a>

### JumpBox <a name="JumpBox" id="@time-loop/cdk-jump-box.JumpBox"></a>

JumpHost.

#### Initializers <a name="Initializers" id="@time-loop/cdk-jump-box.JumpBox.Initializer"></a>

```typescript
import { JumpBox } from '@time-loop/cdk-jump-box'

new JumpBox(scope: Construct, id: Namer, props: JumpBoxProps)
```

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#@time-loop/cdk-jump-box.JumpBox.Initializer.parameter.scope">scope</a></code> | <code>constructs.Construct</code> | *No description.* |
| <code><a href="#@time-loop/cdk-jump-box.JumpBox.Initializer.parameter.id">id</a></code> | <code>multi-convention-namer.Namer</code> | *No description.* |
| <code><a href="#@time-loop/cdk-jump-box.JumpBox.Initializer.parameter.props">props</a></code> | <code><a href="#@time-loop/cdk-jump-box.JumpBoxProps">JumpBoxProps</a></code> | *No description.* |

---

##### `scope`<sup>Required</sup> <a name="scope" id="@time-loop/cdk-jump-box.JumpBox.Initializer.parameter.scope"></a>

- *Type:* constructs.Construct

---

##### `id`<sup>Required</sup> <a name="id" id="@time-loop/cdk-jump-box.JumpBox.Initializer.parameter.id"></a>

- *Type:* multi-convention-namer.Namer

---

##### `props`<sup>Required</sup> <a name="props" id="@time-loop/cdk-jump-box.JumpBox.Initializer.parameter.props"></a>

- *Type:* <a href="#@time-loop/cdk-jump-box.JumpBoxProps">JumpBoxProps</a>

---

#### Methods <a name="Methods" id="Methods"></a>

| **Name** | **Description** |
| --- | --- |
| <code><a href="#@time-loop/cdk-jump-box.JumpBox.toString">toString</a></code> | Returns a string representation of this construct. |

---

##### `toString` <a name="toString" id="@time-loop/cdk-jump-box.JumpBox.toString"></a>

```typescript
public toString(): string
```

Returns a string representation of this construct.

#### Static Functions <a name="Static Functions" id="Static Functions"></a>

| **Name** | **Description** |
| --- | --- |
| <code><a href="#@time-loop/cdk-jump-box.JumpBox.isConstruct">isConstruct</a></code> | Checks if `x` is a construct. |

---

##### `isConstruct` <a name="isConstruct" id="@time-loop/cdk-jump-box.JumpBox.isConstruct"></a>

```typescript
import { JumpBox } from '@time-loop/cdk-jump-box'

JumpBox.isConstruct(x: any)
```

Checks if `x` is a construct.

Use this method instead of `instanceof` to properly detect `Construct`
instances, even when the construct library is symlinked.

Explanation: in JavaScript, multiple copies of the `constructs` library on
disk are seen as independent, completely different libraries. As a
consequence, the class `Construct` in each copy of the `constructs` library
is seen as a different class, and an instance of one class will not test as
`instanceof` the other class. `npm install` will not create installations
like this, but users may manually symlink construct libraries together or
use a monorepo tool: in those cases, multiple copies of the `constructs`
library can be accidentally installed, and `instanceof` will behave
unpredictably. It is safest to avoid using `instanceof`, and using
this type-testing method instead.

###### `x`<sup>Required</sup> <a name="x" id="@time-loop/cdk-jump-box.JumpBox.isConstruct.parameter.x"></a>

- *Type:* any

Any object.

---

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#@time-loop/cdk-jump-box.JumpBox.property.node">node</a></code> | <code>constructs.Node</code> | The tree node. |
| <code><a href="#@time-loop/cdk-jump-box.JumpBox.property.asg">asg</a></code> | <code>aws-cdk-lib.aws_autoscaling.IAutoScalingGroup</code> | *No description.* |
| <code><a href="#@time-loop/cdk-jump-box.JumpBox.property.keyPair">keyPair</a></code> | <code>cdk-ec2-key-pair.KeyPair</code> | *No description.* |
| <code><a href="#@time-loop/cdk-jump-box.JumpBox.property.role">role</a></code> | <code>aws-cdk-lib.aws_iam.IRole</code> | *No description.* |
| <code><a href="#@time-loop/cdk-jump-box.JumpBox.property.securityGroup">securityGroup</a></code> | <code>aws-cdk-lib.aws_ec2.ISecurityGroup</code> | *No description.* |

---

##### `node`<sup>Required</sup> <a name="node" id="@time-loop/cdk-jump-box.JumpBox.property.node"></a>

```typescript
public readonly node: Node;
```

- *Type:* constructs.Node

The tree node.

---

##### `asg`<sup>Required</sup> <a name="asg" id="@time-loop/cdk-jump-box.JumpBox.property.asg"></a>

```typescript
public readonly asg: IAutoScalingGroup;
```

- *Type:* aws-cdk-lib.aws_autoscaling.IAutoScalingGroup

---

##### `keyPair`<sup>Required</sup> <a name="keyPair" id="@time-loop/cdk-jump-box.JumpBox.property.keyPair"></a>

```typescript
public readonly keyPair: KeyPair;
```

- *Type:* cdk-ec2-key-pair.KeyPair

---

##### `role`<sup>Required</sup> <a name="role" id="@time-loop/cdk-jump-box.JumpBox.property.role"></a>

```typescript
public readonly role: IRole;
```

- *Type:* aws-cdk-lib.aws_iam.IRole

---

##### `securityGroup`<sup>Required</sup> <a name="securityGroup" id="@time-loop/cdk-jump-box.JumpBox.property.securityGroup"></a>

```typescript
public readonly securityGroup: ISecurityGroup;
```

- *Type:* aws-cdk-lib.aws_ec2.ISecurityGroup

---


## Structs <a name="Structs" id="Structs"></a>

### JumpBoxProps <a name="JumpBoxProps" id="@time-loop/cdk-jump-box.JumpBoxProps"></a>

#### Initializer <a name="Initializer" id="@time-loop/cdk-jump-box.JumpBoxProps.Initializer"></a>

```typescript
import { JumpBoxProps } from '@time-loop/cdk-jump-box'

const jumpBoxProps: JumpBoxProps = { ... }
```

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#@time-loop/cdk-jump-box.JumpBoxProps.property.vpc">vpc</a></code> | <code>aws-cdk-lib.aws_ec2.IVpc</code> | Which VPC should the jumpbox be in? |
| <code><a href="#@time-loop/cdk-jump-box.JumpBoxProps.property.desiredCapacity">desiredCapacity</a></code> | <code>number</code> | the desired capacity of the auto scaling group. |
| <code><a href="#@time-loop/cdk-jump-box.JumpBoxProps.property.instanceType">instanceType</a></code> | <code>aws-cdk-lib.aws_ec2.InstanceType</code> | *No description.* |
| <code><a href="#@time-loop/cdk-jump-box.JumpBoxProps.property.keyPair">keyPair</a></code> | <code>cdk-ec2-key-pair.KeyPair</code> | You must provide either a keypair or a kmsKey. |
| <code><a href="#@time-loop/cdk-jump-box.JumpBoxProps.property.kmsKey">kmsKey</a></code> | <code>aws-cdk-lib.aws_kms.Key</code> | You must provide either a keypair or a kmsKey. |
| <code><a href="#@time-loop/cdk-jump-box.JumpBoxProps.property.machineImage">machineImage</a></code> | <code>aws-cdk-lib.aws_ec2.IMachineImage</code> | Default to latest Amazon Linux 2022 AMI for ARM64. |
| <code><a href="#@time-loop/cdk-jump-box.JumpBoxProps.property.maxCapacity">maxCapacity</a></code> | <code>number</code> | the maximum capacity of the auto scaling group. |
| <code><a href="#@time-loop/cdk-jump-box.JumpBoxProps.property.minCapacity">minCapacity</a></code> | <code>number</code> | the minimum capacity of the auto scaling group. |
| <code><a href="#@time-loop/cdk-jump-box.JumpBoxProps.property.role">role</a></code> | <code>aws-cdk-lib.aws_iam.IRole</code> | *No description.* |
| <code><a href="#@time-loop/cdk-jump-box.JumpBoxProps.property.securityGroup">securityGroup</a></code> | <code>aws-cdk-lib.aws_ec2.ISecurityGroup</code> | *No description.* |
| <code><a href="#@time-loop/cdk-jump-box.JumpBoxProps.property.sshAccess">sshAccess</a></code> | <code>boolean</code> | *No description.* |
| <code><a href="#@time-loop/cdk-jump-box.JumpBoxProps.property.vpcSubnets">vpcSubnets</a></code> | <code>aws-cdk-lib.aws_ec2.SubnetSelection</code> | *No description.* |

---

##### `vpc`<sup>Required</sup> <a name="vpc" id="@time-loop/cdk-jump-box.JumpBoxProps.property.vpc"></a>

```typescript
public readonly vpc: IVpc;
```

- *Type:* aws-cdk-lib.aws_ec2.IVpc

Which VPC should the jumpbox be in?

---

##### `desiredCapacity`<sup>Optional</sup> <a name="desiredCapacity" id="@time-loop/cdk-jump-box.JumpBoxProps.property.desiredCapacity"></a>

```typescript
public readonly desiredCapacity: number;
```

- *Type:* number
- *Default:* undefined

the desired capacity of the auto scaling group.

---

##### `instanceType`<sup>Optional</sup> <a name="instanceType" id="@time-loop/cdk-jump-box.JumpBoxProps.property.instanceType"></a>

```typescript
public readonly instanceType: InstanceType;
```

- *Type:* aws-cdk-lib.aws_ec2.InstanceType
- *Default:* aws_ec2.InstanceType.of(aws_ec2.InstanceClass.T4A,aws_ec2.InstanceSize.NANO)

---

##### `keyPair`<sup>Optional</sup> <a name="keyPair" id="@time-loop/cdk-jump-box.JumpBoxProps.property.keyPair"></a>

```typescript
public readonly keyPair: KeyPair;
```

- *Type:* cdk-ec2-key-pair.KeyPair

You must provide either a keypair or a kmsKey.

You must not provide both.
If a keyPair is provided, it will simply be used.

---

##### `kmsKey`<sup>Optional</sup> <a name="kmsKey" id="@time-loop/cdk-jump-box.JumpBoxProps.property.kmsKey"></a>

```typescript
public readonly kmsKey: Key;
```

- *Type:* aws-cdk-lib.aws_kms.Key

You must provide either a keypair or a kmsKey.

You must not provide both.
If a kmsKey is provided, a keyPair will be generated.

Why not auto-generate a key?
Jumpboxes exist to provide a route to access secured resources.
Those resources MUST be encrypted at rest for compliance reasons.
That implies your service already is using a KMS key.
These things aren't free.
It makes sense to require re-using the key associated with the resource.

---

##### `machineImage`<sup>Optional</sup> <a name="machineImage" id="@time-loop/cdk-jump-box.JumpBoxProps.property.machineImage"></a>

```typescript
public readonly machineImage: IMachineImage;
```

- *Type:* aws-cdk-lib.aws_ec2.IMachineImage
- *Default:* MachineImage.latestAmazonLinux({generation:AmazonLinuxGeneration.AMAZON_LINUX_2022,edition:AmazonLinuxEdition.STANDARD,cpuType:AmazonLinuxCpuType.ARM_64})

Default to latest Amazon Linux 2022 AMI for ARM64.

---

##### `maxCapacity`<sup>Optional</sup> <a name="maxCapacity" id="@time-loop/cdk-jump-box.JumpBoxProps.property.maxCapacity"></a>

```typescript
public readonly maxCapacity: number;
```

- *Type:* number
- *Default:* 1

the maximum capacity of the auto scaling group.

---

##### `minCapacity`<sup>Optional</sup> <a name="minCapacity" id="@time-loop/cdk-jump-box.JumpBoxProps.property.minCapacity"></a>

```typescript
public readonly minCapacity: number;
```

- *Type:* number
- *Default:* 0

the minimum capacity of the auto scaling group.

---

##### `role`<sup>Optional</sup> <a name="role" id="@time-loop/cdk-jump-box.JumpBoxProps.property.role"></a>

```typescript
public readonly role: IRole;
```

- *Type:* aws-cdk-lib.aws_iam.IRole
- *Default:* create a role

---

##### `securityGroup`<sup>Optional</sup> <a name="securityGroup" id="@time-loop/cdk-jump-box.JumpBoxProps.property.securityGroup"></a>

```typescript
public readonly securityGroup: ISecurityGroup;
```

- *Type:* aws-cdk-lib.aws_ec2.ISecurityGroup
- *Default:* create a security group

---

##### `sshAccess`<sup>Optional</sup> <a name="sshAccess" id="@time-loop/cdk-jump-box.JumpBoxProps.property.sshAccess"></a>

```typescript
public readonly sshAccess: boolean;
```

- *Type:* boolean
- *Default:* false implement SSH access

---

##### `vpcSubnets`<sup>Optional</sup> <a name="vpcSubnets" id="@time-loop/cdk-jump-box.JumpBoxProps.property.vpcSubnets"></a>

```typescript
public readonly vpcSubnets: SubnetSelection;
```

- *Type:* aws-cdk-lib.aws_ec2.SubnetSelection
- *Default:* default subnet selection

---



