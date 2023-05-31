import { aws_autoscaling, aws_ec2, aws_iam, aws_kms, Duration, Names } from 'aws-cdk-lib';
import { KeyPair } from 'cdk-ec2-key-pair';
import { Construct } from 'constructs';
import { Namer } from 'multi-convention-namer';

export interface JumpBoxProps {
  /**
   * @default aws_ec2.InstanceType.of(aws_ec2.InstanceClass.T4A,aws_ec2.InstanceSize.NANO)
   */
  readonly instanceType?: aws_ec2.InstanceType;
  /**
   * Default to latest Amazon Linux 2022 AMI for ARM64
   *
   * @default  MachineImage.latestAmazonLinux({generation:AmazonLinuxGeneration.AMAZON_LINUX_2022,edition:AmazonLinuxEdition.STANDARD,cpuType:AmazonLinuxCpuType.ARM_64})
   */
  readonly machineImage?: aws_ec2.IMachineImage;
  /**
   * You must provide either a keypair or a kmsKey.
   * You must not provide both.
   * If a keyPair is provided, it will simply be used.
   */
  readonly keyPair?: KeyPair;
  /**
   * You must provide either a keypair or a kmsKey.
   * You must not provide both.
   * If a kmsKey is provided, a keyPair will be generated.
   *
   * Why not auto-generate a key?
   * Jumpboxes exist to provide a route to access secured resources.
   * Those resources MUST be encrypted at rest for compliance reasons.
   * That implies your service already is using a KMS key.
   * These things aren't free.
   * It makes sense to require re-using the key associated with the resource.
   */
  readonly kmsKey?: aws_kms.Key;
  /**
   * @default - create a role
   */
  readonly role?: aws_iam.IRole;
  /**
   * @default - create a security group
   */
  readonly securityGroup?: aws_ec2.ISecurityGroup;
  /**
   * @default false implement SSH access
   */
  readonly sshAccess?: boolean;
  /**
   * Which VPC should the jumpbox be in?
   */
  readonly vpc: aws_ec2.IVpc;
  /**
   * @default - default subnet selection
   */
  readonly vpcSubnets?: aws_ec2.SubnetSelection;
  readonly desiredCapacity?: number;
  readonly minCapacity?: number;
  readonly maxCapacity?: number;
}

/**
 * JumpHost
 */
export class JumpBox extends Construct {
  readonly asg: aws_autoscaling.IAutoScalingGroup;
  readonly keyPair: KeyPair;
  readonly role: aws_iam.IRole;
  readonly securityGroup: aws_ec2.ISecurityGroup;

  constructor(scope: Construct, id: Namer, props: JumpBoxProps) {
    super(scope, id.pascal);

    const instanceType =
      props.instanceType ?? aws_ec2.InstanceType.of(aws_ec2.InstanceClass.T4G, aws_ec2.InstanceSize.NANO);

    const machineImage =
      props.machineImage ??
      aws_ec2.MachineImage.latestAmazonLinux({
        generation: aws_ec2.AmazonLinuxGeneration.AMAZON_LINUX_2022,
        edition: aws_ec2.AmazonLinuxEdition.STANDARD,
        cpuType: aws_ec2.AmazonLinuxCpuType.ARM_64,
      });

    if (props.kmsKey) {
      if (props.keyPair) throw new Error('You must not provide both a kmsKey and a keyPair');
      this.keyPair = new KeyPair(this, 'KeyPair', {
        name: id.pascal,
        kms: props.kmsKey,
        // What I'd really like to do is remove the function name.
        // It provides no value, but causes conflicts
        // when you try to deploy more than one jumpbox in a given environment.
        // https://github.com/udondan/cdk-ec2-key-pair/issues/53
        resourcePrefix: Names.uniqueId(this).slice(-8),
        storePublicKey: true,
      });
    } else {
      if (!props.keyPair) throw new Error('You must provide either a keypair or a kmsKey');
      this.keyPair = props.keyPair;
    }

    this.role =
      props.role ??
      new aws_iam.Role(this, 'Role', {
        assumedBy: new aws_iam.ServicePrincipal('ec2.amazonaws.com'),
        managedPolicies: [aws_iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMManagedInstanceCore')],
      });

    this.securityGroup =
      props.securityGroup ??
      new aws_ec2.SecurityGroup(this, 'SecurityGroup', {
        description: `SG for ${id.pascal}`,
        vpc: props.vpc,
      });
    props.sshAccess && this.securityGroup.addIngressRule(aws_ec2.Peer.anyIpv4(), aws_ec2.Port.tcp(22));

    this.asg = new aws_autoscaling.AutoScalingGroup(this, 'AutoScalingGroup', {
      autoScalingGroupName: id.pascal,

      instanceType,
      keyName: this.keyPair.keyPairName,
      machineImage,
      desiredCapacity: props.desiredCapacity,
      minCapacity: props.minCapacity ?? 0,
      maxCapacity: props.maxCapacity ?? 1,
      role: this.role,
      securityGroup: this.securityGroup,
      signals: aws_autoscaling.Signals.waitForMinCapacity({ timeout: Duration.minutes(45) }),
      vpc: props.vpc,
      vpcSubnets: props.vpcSubnets,
    });
  }
}
