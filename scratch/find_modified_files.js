import fs from 'fs';
import readline from 'readline';

async function main() {
  const logPath = 'C:\\\\Users\\\\Shridhar\\\\.gemini\\\\antigravity-ide\\\\brain\\\\6c0a1941-458b-4525-84a9-e7a75a5c0721\\\\.system_generated\\\\logs\\\\transcript.jsonl';
  const fileStream = fs.createReadStream(logPath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  const modifiedFiles = new Set();

  for await (const line of rl) {
    if (!line.trim()) continue;
    try {
      const step = JSON.parse(line);
      if (step.tool_calls) {
        for (const call of step.tool_calls) {
          if ((call.name === 'replace_file_content' || call.name === 'multi_replace_file_content' || call.name === 'write_to_file') && call.args) {
            let args = call.args;
            if (typeof args === 'string') {
              try {
                args = JSON.parse(args);
              } catch (e) {
                // Try simple string extraction if JSON parsing of the arg string fails
                const match = args.match(/"TargetFile"\s*:\s*"([^"]+)"/);
                if (match) {
                  modifiedFiles.add(match[1]);
                }
              }
            }
            if (args && args.TargetFile) {
              modifiedFiles.add(args.TargetFile);
            }
          }
        }
      }
    } catch (e) {
      // ignore
    }
  }

  console.log('Modified Files:', Array.from(modifiedFiles));
}

main().catch(console.error);
