import { App, assertions, aws_kms, aws_ec2, aws_iam, CfnElement, Resource, Stack } from 'aws-cdk-lib';
import { KeyPair } from 'cdk-ec2-key-pair';
import { Namer } from 'multi-convention-namer';

import { JumpBox } from '../src';

export function getLogicalId(resource: Resource): string {
  return resource.stack.getLogicalId(resource.node.defaultChild as CfnElement);
}

const name = new Namer(['test']);

describe('JumpBox', () => {
  describe('default', () => {
    const app = new App();
    const stack = new Stack(app, name.pascal);
    new JumpBox(stack, name, {
      kmsKey: new aws_kms.Key(stack, 'Key'),
      vpc: new aws_ec2.Vpc(stack, 'Vpc'),
    });
    const template = assertions.Template.fromStack(stack);
    it('creates resources', () => {
      [
        'Custom::EC2-Key-Pair',
        'AWS::EC2::SecurityGroup',
        'AWS::IAM::InstanceProfile',
        'AWS::AutoScaling::LaunchConfiguration',
        'AWS::AutoScaling::AutoScalingGroup',
      ].forEach((r) => template.resourceCountIs(r, 1));
    });
    it('created role makes sense', () => {
      template.hasResourceProperties('AWS::IAM::Role', {
        AssumeRolePolicyDocument: assertions.Match.objectLike({
          Statement: [
            {
              Action: 'sts:AssumeRole',
              Effect: 'Allow',
              Principal: {
                Service: 'ec2.amazonaws.com',
              },
            },
          ],
        }),
        ManagedPolicyArns: assertions.Match.arrayWith([
          {
            'Fn::Join': [
              '',
              [
                'arn:',
                {
                  Ref: 'AWS::Partition',
                },
                ':iam::aws:policy/AmazonSSMManagedInstanceCore',
              ],
            ],
          },
        ]),
      });
    });
    it('sshAccess disabled by default', () => {
      template.hasResourceProperties('AWS::EC2::SecurityGroup', {
        SecurityGroupIngress: assertions.Match.absent(),
      });
    });
    it('instanceType is t3a.nano', () => {
      template.hasResourceProperties('AWS::AutoScaling::LaunchConfiguration', {
        InstanceType: 't3a.nano',
      });
    });

    // it('outputs ProxyEndpoint', () => {
    //   template.hasOutput('ProxyEndpoint', {});
    // });
  });
  describe('options', () => {
    it('instanceType', () => {
      const app = new App();
      const stack = new Stack(app, name.pascal);
      new JumpBox(stack, new Namer(['test']), {
        kmsKey: new aws_kms.Key(stack, 'Key'),
        instanceType: aws_ec2.InstanceType.of(aws_ec2.InstanceClass.R6G, aws_ec2.InstanceSize.XLARGE24),
        vpc: new aws_ec2.Vpc(stack, 'Vpc'),
      });
      const template = assertions.Template.fromStack(stack);
      template.hasResourceProperties('AWS::AutoScaling::LaunchConfiguration', {
        InstanceType: 'r6g.24xlarge',
      });
    });
    it('keyPair', () => {
      const app = new App();
      const stack = new Stack(app, name.pascal);

      new JumpBox(stack, new Namer(['test']), {
        keyPair: new KeyPair(stack, 'KeyPair', { kms: new aws_kms.Key(stack, 'Key'), name: 'premadeKeyPair' }),
        vpc: new aws_ec2.Vpc(stack, 'Vpc'),
      });
      const template = assertions.Template.fromStack(stack);
      template.hasResourceProperties('Custom::EC2-Key-Pair', { Name: 'premadeKeyPair' });
    });
    it('errors when both kmsKey and keyPair', () => {
      const app = new App();
      const stack = new Stack(app, name.pascal);
      const kmsKey = new aws_kms.Key(stack, 'Key');

      new JumpBox(stack, new Namer(['test']), {
        keyPair: new KeyPair(stack, 'KeyPair', { kms: kmsKey, name: 'premadeKeyPair' }),
        kmsKey,
        vpc: new aws_ec2.Vpc(stack, 'Vpc'),
      });
      const annotations = assertions.Annotations.fromStack(stack);
      annotations.hasError('*', assertions.Match.stringLikeRegexp('You must not provide both a kmsKey and a keyPair'));
    });
    it('errors when neither kmsKey nor keyPair', () => {
      const app = new App();
      const stack = new Stack(app, name.pascal);
      expect(() => {
        new JumpBox(stack, new Namer(['test']), {
          vpc: new aws_ec2.Vpc(stack, 'Vpc'),
        });
      }).toThrowError('You must provide either a keypair or a kmsKey');
    });
    it('role', () => {
      const app = new App();
      const stack = new Stack(app, name.pascal);
      const role = new aws_iam.Role(stack, 'Role', {
        assumedBy: new aws_iam.ServicePrincipal('fake'),
      });
      // const foo = stack.node.findChild('Role');
      // stack.getLogicalId();
      new JumpBox(stack, new Namer(['test']), {
        kmsKey: new aws_kms.Key(stack, 'Key'),
        role,
        vpc: aws_ec2.Vpc.fromLookup(stack, 'Vpc', {}),
      });
      const template = assertions.Template.fromStack(stack);
      template.hasResourceProperties('AWS::IAM::InstanceProfile', {
        Roles: assertions.Match.arrayWith([
          {
            Ref: getLogicalId(role),
          },
        ]),
      });
    });
    it('securityGroup', () => {
      const app = new App();
      const stack = new Stack(app, name.pascal);
      const vpc = new aws_ec2.Vpc(stack, 'Vpc');
      const securityGroup = new aws_ec2.SecurityGroup(stack, 'Sg', { vpc });
      new JumpBox(stack, new Namer(['test']), {
        kmsKey: new aws_kms.Key(stack, 'Key'),
        securityGroup,
        vpc,
      });
      const template = assertions.Template.fromStack(stack);
      template.hasResourceProperties('AWS::AutoScaling::LaunchConfiguration', {
        SecurityGroups: [
          {
            'Fn::GetAtt': ['SgD4954771', 'GroupId'],
          },
        ],
      });
    });
    it('sshAccess', () => {
      const app = new App();
      const stack = new Stack(app, name.pascal);
      new JumpBox(stack, new Namer(['test']), {
        kmsKey: new aws_kms.Key(stack, 'Key'),
        sshAccess: true,
        vpc: new aws_ec2.Vpc(stack, 'Vpc'),
      });
      const template = assertions.Template.fromStack(stack);
      template.hasResourceProperties('AWS::EC2::SecurityGroup', {
        GroupDescription: 'SG for Test',
        SecurityGroupIngress: [
          {
            CidrIp: '0.0.0.0/0',
            Description: 'from 0.0.0.0/0:22',
            FromPort: 22,
            IpProtocol: 'tcp',
            ToPort: 22,
          },
        ],
      });
    });
    it('vpcSubnets', () => {
      const app = new App();
      const stack = new Stack(app, name.pascal);
      new JumpBox(stack, new Namer(['test']), {
        kmsKey: new aws_kms.Key(stack, 'Key'),
        vpc: new aws_ec2.Vpc(stack, 'Vpc'),
        vpcSubnets: { subnetType: aws_ec2.SubnetType.PRIVATE_ISOLATED },
      });
      const template = assertions.Template.fromStack(stack);
      template.hasResourceProperties('AWS::AutoScaling::AutoScalingGroup', {
        VPCZoneIdentifier: ['p-12345', 'p-67890'],
      });
    });
  });
});
