const fs = require('fs');
const path = require('path');

const controllerPath = path.join(__dirname, '../src/whatsapp/whatsapp.controller.ts');
const servicePath = path.join(__dirname, '../src/whatsapp/whatsapp.service.ts');

let controllerCode = fs.readFileSync(controllerPath, 'utf8');
let serviceCode = fs.readFileSync(servicePath, 'utf8');

// Find processParsedMessage implementation in controller
const startIndex = controllerCode.indexOf('  async processParsedMessage(parsed: any, salon: any): Promise<void> {');
if (startIndex === -1) {
  console.error("Could not find processParsedMessage in controller");
  process.exit(1);
}

// Find the end of processParsedMessage. It ends at the closing brace before:
// "  private async getSalonId(req: any): Promise<string> {"
const endIndexMarker = '  private async getSalonId(req: any): Promise<string> {';
const markerIndex = controllerCode.indexOf(endIndexMarker);
if (markerIndex === -1) {
  console.error("Could not find getSalonId marker in controller");
  process.exit(1);
}

// Extract the method block
let methodBlock = controllerCode.substring(startIndex, markerIndex).trim();

// Ensure it ends with exactly one closing brace for the method
// We can find the last closing brace of the method block
const lastBraceIndex = methodBlock.lastIndexOf('}');
methodBlock = methodBlock.substring(0, lastBraceIndex + 1);

// Remap references inside methodBlock:
// 1. this.whatsappService.sendMessage -> this.sendMessage
methodBlock = methodBlock.replace(/this\.whatsappService\.sendMessage/g, 'this.sendMessage');
// 2. this.whatsappService.saveIncomingMessage -> this.saveIncomingMessage
methodBlock = methodBlock.replace(/this\.whatsappService\.saveIncomingMessage/g, 'this.saveIncomingMessage');

// Append methodBlock inside the WhatsappService class (before the last closing brace)
const lastClosingBraceIndex = serviceCode.lastIndexOf('}');
serviceCode = serviceCode.substring(0, lastClosingBraceIndex) + '\n\n' + methodBlock + '\n}\n';

// Replace the processParsedMessage block in controller with just a call or completely clean it up
const remainingController = controllerCode.substring(0, startIndex) + controllerCode.substring(markerIndex);
// Replace handleIncomingMessage call site to call this.whatsappService.processParsedMessage
let updatedController = remainingController.replace(
  'await this.processParsedMessage(parsed, salon);',
  'await this.whatsappService.processParsedMessage(parsed, salon);'
);

// Save updated files
fs.writeFileSync(servicePath, serviceCode, 'utf8');
fs.writeFileSync(controllerPath, updatedController, 'utf8');

console.log("Refactoring completed successfully!");
