const { clickupCdk } = require('@time-loop/clickup-projen');

const bundledDeps = [
  // 'cdk-iam-floyd@^0.300.0', // locked because of cdk-ec2-key-pair
];
const peerDeps = [
  'cdk-ec2-key-pair@^3.2.0',
  'cdk-iam-floyd@^0.300.0',
  'constructs@^10.0.5',
  'multi-convention-namer@^0.1.11',
];

const project = new clickupCdk.ClickUpCdkConstructLibrary({
  name: '@time-loop/cdk-jump-box',

  cdkVersion: '2.17.0',
  defaultReleaseBranch: 'main',

  bundledDeps,
  deps: [...bundledDeps, ...peerDeps],
  devDeps: [
    // ...peerDeps.map((d) => {
    //   const [name, version] = d.split('@');
    //   return [name, version.substring(1)].join('@');
    // }),
    ...peerDeps,
    '@time-loop/clickup-projen',
  ],
  peerDeps,

  repositoryUrl: 'https://github.com/time-loop/cdk-jump-box.git', // TODO: leverage default
  authorName: '', // leverage default
  authorAddress: '', // leverage default
});

project.synth();
