To use this CLI:

Save the YAML content to prompts.yaml
Save the TypeScript code to codeGen.ts
Install dependencies: npm install js-yaml axios commander inquirer @types/js-yaml @types/inquirer
Compile and run: ts-node codeGen.ts --api-key YOUR_API_KEY

This example provides a solid foundation for a code generation CLI. It includes:

YAML-based prompt templates
JSON-based context storage
Interactive command-line prompts
API integration with Anthropic's Claude model
Basic error handling and file I/O

To handle your existing interfaces, types, classes, utilities, and examples:

Create a project_context directory in your project root.
Organize your existing code into subdirectories:
Copyproject_context/
interfaces/
types/
classes/
utilities/
examples/

Modify the CodeGenerator class to load and include relevant existing code:

typescriptCopyclass CodeGenerator {
// ... existing code ...

private loadExistingCode(language: string, type: string): string {
const dir = path.join('project_context', type);
const files = fs.readdirSync(dir).filter(file => file.endsWith(this.getFileExtension(language)));
return files.map(file => fs.readFileSync(path.join(dir, file), 'utf8')).join('\n\n');
}

public async generateCode(): Promise<void> {
// ... existing code ...

    context.existingTypes = this.loadExistingCode(context.language, 'types') +
                            this.loadExistingCode(context.language, 'interfaces');
    context.existingCode = this.loadExistingCode(context.language, 'classes') +
                           this.loadExistingCode(context.language, 'utilities') +
                           this.loadExistingCode(context.language, 'examples');

    // ... rest of the method ...

}
}
This approach allows you to maintain your existing code separately and include it in the context for code generation.
Regarding TypeScript vs Python for the CLI:
TypeScript is a good choice because:

It aligns with your TypeScript code generation needs.
You can leverage type checking for better code quality.
It's easier to integrate with your existing TypeScript codebase.

However, Python could be a better choice if:

You're more comfortable with Python.
You need to integrate with other Python-based tools or scripts.
You prefer Python's simplicity for quick scripting tasks.

The core logic would remain similar in Python, with some syntax differences and using libraries like pyyaml instead of js-yaml.
This example provides a robust starting point for your code generation needs, allowing for easy expansion and customization as your requirements grow.
