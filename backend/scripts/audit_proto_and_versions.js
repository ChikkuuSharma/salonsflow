const fs = require('fs');
const path = require('path');

const baileysPath = require.resolve('@whiskeysockets/baileys');
const baileysDir = path.dirname(path.dirname(baileysPath));

console.log('================================================================');
console.log('=== AUDITING PROTOBUF DEPENDENCY VERSIONS & SCHEMAS ===');
console.log('================================================================\n');

console.log(`Baileys Directory: ${baileysDir}`);
console.log(`require.resolve('@whiskeysockets/baileys'): ${baileysPath}`);

const pkgJson = JSON.parse(fs.readFileSync(path.join(baileysDir, 'package.json'), 'utf-8'));
console.log(`Baileys package.json version: ${pkgJson.version}`);

const protobufjsPkgPath = require.resolve('protobufjs/package.json');
const protobufjsPkg = JSON.parse(fs.readFileSync(protobufjsPkgPath, 'utf-8'));
console.log(`protobufjs version: ${protobufjsPkg.version}`);
console.log(`protobufjs path: ${protobufjsPkgPath}`);

const waDefaults = require(path.join(baileysDir, 'lib', 'Defaults', 'index.js'));
console.log(`WAVersion Default:`, waDefaults.WAVersion || waDefaults.DEFAULT_CONNECTION_CONFIG?.version);

const { proto } = require(path.join(baileysDir, 'WAProto', 'index.js'));
console.log(`proto.ADVSignedDeviceIdentity defined:`, !!proto.ADVSignedDeviceIdentity);
console.log(`proto.ADVSignedDeviceIdentityHMAC defined:`, !!proto.ADVSignedDeviceIdentityHMAC);
