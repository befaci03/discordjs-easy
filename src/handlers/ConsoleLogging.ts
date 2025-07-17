import { Chalk, ChalkInstance } from "chalk";

export class Logger {
    private c: ChalkInstance;
    private msgstart: string;
    constructor() { this.c = new Chalk();  this.msgstart = `DJSEasy: [{Logging.LEVEL.text}] ` }

    public Error(message: string) {
        console.log(this.c.italic.redBright.bold(`${this.msgstart.replace('{Logging.LEVEL.text}', 'error'.toUpperCase())}${this.c.reset(message)}`));
    }
    public Cirtical(message: string) {
        console.log(this.c.italic.red.bold(`${this.msgstart.replace('{Logging.LEVEL.text}', 'critical'.toUpperCase())}${this.c.reset(message)}`));
    }
    public Warning(message: string) {
        console.log(this.c.italic.yellow(`${this.msgstart.replace('{Logging.LEVEL.text}', 'warning'.toUpperCase())}${this.c.reset(message)}`));
    }
    public Success(message: string) {
        console.log(this.c.italic.greenBright(`${this.msgstart.replace('{Logging.LEVEL.text}', 'success'.toUpperCase())}${this.c.reset(message)}`));
    }
    public Log(message: string) {
        console.log(`${this.msgstart.replace('{Logging.LEVEL.text}', 'log'.toUpperCase())}${this.c.reset(message)}`);
    }
    public Info(message: string) {
        console.log(this.c.blueBright(`${this.msgstart.replace('{Logging.LEVEL.text}', 'info'.toUpperCase())}${this.c.reset(message)}`));
    }
    public NotImportant(message: string) {
        console.log(this.c.gray(`DJSEasy: ${message}`));
    }
}
