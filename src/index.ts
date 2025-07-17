import * as djs from "discord.js";
import { Logger } from "./handlers/ConsoleLogging";

// types
import { Partials, RESTOptions, Events as DJSEvents } from "discord.js";

interface ClientOptions {
    shards?: number | readonly number[] | 'auto';
    closeTimeout?: number;
    partials?: (keyof typeof Partials)[];
    intents: ("Guilds" | "ManageGuild" | "Voices" | "Messages" | "AutoMod" | "Webhooks" | "Presence" | "Members")[];
    rest?: Partial<RESTOptions>;
}

interface EventOptions {
    once?: boolean;
}

interface Option {
    name: string;
    description: string;
    type: "number" | "string" | "user" | "integer";
    required: boolean;
    minValue?: number;
    maxValue?: number;
    choices?: { name: string; value: string | number }[];
}

export enum Events {
    // Guild-related
    guildJoined = DJSEvents.GuildCreate,
    guildLeaved = DJSEvents.GuildDelete,
    guildUpdated = DJSEvents.GuildUpdate,

    // Channel-related
    channelCreated = DJSEvents.ChannelCreate,
    channelDeleted = DJSEvents.ChannelDelete,
    channelUpdated = DJSEvents.ChannelUpdate,
    channelPinsUpdated = DJSEvents.ChannelPinsUpdate,

    // Emoji & stickers
    emojiCreated = DJSEvents.GuildEmojiCreate,
    emojiDeleted = DJSEvents.GuildEmojiDelete,
    emojiUpdated = DJSEvents.GuildEmojiUpdate,
    stickerCreated = DJSEvents.GuildStickerCreate,
    stickerDeleted = DJSEvents.GuildStickerDelete,
    stickerUpdated = DJSEvents.GuildStickerUpdate,

    // Member-related
    memberJoined = DJSEvents.GuildMemberAdd,
    memberLeaved = DJSEvents.GuildMemberRemove,
    memberUpdated = DJSEvents.GuildMemberUpdate,

    // Role-related
    roleCreated = DJSEvents.GuildRoleCreate,
    roleDeleted = DJSEvents.GuildRoleDelete,
    roleUpdated = DJSEvents.GuildRoleUpdate,

    // Presence & voice
    presenceUpdated = DJSEvents.PresenceUpdate,
    voiceStateUpdated = DJSEvents.VoiceStateUpdate,

    // Messages
    newMessage = DJSEvents.MessageCreate,
    messageDeleted = DJSEvents.MessageDelete,
    messageUpdated = DJSEvents.MessageUpdate,
    messageReactionAdded = DJSEvents.MessageReactionAdd,
    messageReactionRemoved = DJSEvents.MessageReactionRemove,
    messageReactionRemovedAll = DJSEvents.MessageReactionRemoveAll,

    typingStarted = DJSEvents.TypingStart,

    // Users
    userUpdated = DJSEvents.UserUpdate,

    // Interaction
    interactionCreated = DJSEvents.InteractionCreate,

    // Webhooks
    webhookUpdated = DJSEvents.WebhooksUpdate,

    // AutoModeration
    autoModBlocked = DJSEvents.AutoModerationActionExecution,

    // Client stuff
    botReady = DJSEvents.ClientReady,
    botReconnecting = DJSEvents.ShardReconnecting,
    botDisconnected = DJSEvents.ShardDisconnect,
    botResumed = DJSEvents.ShardResume,
    botError = DJSEvents.Error,
    botWarn = DJSEvents.Warn,
    botDebug = DJSEvents.Debug
}
// types

var Log = new Logger();

export class Bot {
    public discordjs_client: djs.Client;
    private token: string;
    private showDebugLogLevel: boolean;

    constructor(token: string, options: ClientOptions, showDebugLogLevel: boolean = false) {
        this.discordjs_client = new djs.Client({
            intents: this._getIntents__(options.intents),
            closeTimeout: options.closeTimeout ?? 15000,
        });
        this.token = token;
        this.login().catch(err => {
            Log.Error(`Connection failure: ${err}`);
        });

        this.showDebugLogLevel = showDebugLogLevel;
        if (this.showDebugLogLevel) {
            this.discordjs_client.on(djs.Events.Debug, (message) => {
                Log.NotImportant(`[Discord] ${message}`);
            });
        }

        this.discordjs_client.once(djs.Events.ClientReady, (client) => {
            Log.Success(`Discord Bot connected as ${client.user.tag}!`);
        });

        this.discordjs_client.on("error", (err) => Log.Error(`Client Error: ${err}`));
    }


    /**
     * Add a listener via Discord.JS
     * Example: bot.on("messageCreate", (msg) => ...)
     */
    public on<K extends keyof djs.ClientEvents>(
        event: K,
        callback: (...args: djs.ClientEvents[K]) => void
    ) {
        this.discordjs_client.on(event, callback);
    }

    /**
     * Send a message on a channel
     */
    public async sendMessage(channelId: string, content: string | djs.MessagePayload | djs.MessageCreateOptions) {
        const channel = await this.discordjs_client.channels.fetch(channelId);
    
        if (!channel || !channel.isTextBased()) {
            throw Log.Error(`Cannot find the channel (or not textual): ${channelId}`);
        }

        if (
            channel instanceof djs.TextChannel ||
            channel instanceof djs.DMChannel ||
            channel instanceof djs.NewsChannel
        ) {
            return channel.send(content);
        }
    
        throw Log.Error(`The channel ${channelId} doesn't supports sending messages.`);
    }

    /**
     * Send a message to a user (via his ID) in his DM
     */
    public async sendDMMessage(userId: string, content: string | djs.MessagePayload | djs.MessageCreateOptions) {
        try {
            const user = await this.discordjs_client.users.fetch(userId);
            if (!user) throw Log.Error(`User ${userId} not found`);

            const dmChannel = await user.createDM();
            return await dmChannel.send(content).then(() => Log.NotImportant(`Sent a message to ${user.username}`));
        } catch (err) {
            throw Log.Error(`Impossible to send the message to ${userId}: ${err}`);
        }
    }
    
    /**
     * Register prefix commands via this
     * Usage Example: bot.registerCommand("!").addCommand("lorem", (message, args) => ...).addCommand("hello", (message, args) => ...) ...;
     */
    public registerCommands(prefix: string): {
        addCommand: (name: string, handler: (msg: djs.Message, args: string[]) => void) => any;
    } {
        const commandMap: Map<string, (msg: djs.Message, args: string[]) => void> = new Map();
    
        this.discordjs_client.on("messageCreate", (msg) => {
            if (msg.author.bot || !msg.content.startsWith(prefix)) return;
    
            const args = msg.content.slice(prefix.length).trim().split(/ +/);
            const cmd = args.shift()?.toLowerCase();
    
            if (!cmd) return;
    
            const handler = commandMap.get(cmd);
            if (handler) {
                try {
                    handler(msg, args);
                } catch (err) {
                    Log.Error(`Error while executing the prefix command "${cmd}": ${err}`);
                    msg.reply("An error has been occurred, please contact the creator of the bot.");
                }
            }
        });
    
        const builder = {
            addCommand: (name: string, handler: (msg: djs.Message, args: string[]) => void) => {
                commandMap.set(name.toLowerCase(), handler);
                if (this.showDebugLogLevel) Log.NotImportant(`Prefix command "${name}" registered.`);
                return builder;
            }
        };
    
        return builder;
    }

    /**
     * Register slash commands via this
     * Usage Example: bot.registerSlashCommand()
     *   .addCommand({ name: "lorem", description: "Send a Lorem Ipsum" }, (message, args) => ...)
     *   .addCommand({ name: "hello", description: "Hello, World!" }, (message, args) => ...)
     *  ...;
     */
    public registerSlashCommands(): {
        addCommand: (
            command: { name: string, description: string, options?: Option[] },
            handler: (interaction: djs.ChatInputCommandInteraction) => void
        ) => any;
    } {
        const commandMap = new Map<
            string,
            (interaction: djs.ChatInputCommandInteraction) => void
        >();

        this.discordjs_client.on("interactionCreate", async (interaction) => {
            if (!interaction.isChatInputCommand()) return;

            const handler = commandMap.get(interaction.commandName);
            if (handler) {
                try {
                    await handler(interaction);
                } catch (err) {
                    Log.Error(`Error while executing the slash command "/${interaction.commandName}": ${err}`);
                    await interaction.reply({
                        content: "An error has been occurred, please contact the creator of the bot.",
                        ephemeral: true
                    });
                }
            }
        });

        const builder = {
            addCommand: (
                command: { name: string, description: string, options?: Option[] },
                handler: (interaction: djs.ChatInputCommandInteraction) => void
            ) => {
                const name = command.name;
                const description = command.description;

                commandMap.set(name, handler);
                this.discordjs_client.once(djs.Events.ClientReady, async () => {
                    const options = command.options?.map((opt) => {
                        let type: number;
                        switch (opt.type) {
                            case "string": type = 3; break;
                            case "number": type = 10; break;
                            case "integer": type = 4; break;
                            case "user": type = 6; break;
                            default: throw new Error(`Unknown type: ${opt.type}`);
                        }

                        return {
                            name: opt.name,
                            description: opt.description,
                            type,
                            required: opt.required,
                            min_value: opt.minValue,
                            max_value: opt.maxValue,
                            choices: opt.choices // facultatif
                        };
                    }) ?? [];

                    const data = {
                        name,
                        description,
                        type: 1,
                        options
                    };

                    try {
                        await this.discordjs_client.application?.commands.create(data);
                        if (this.showDebugLogLevel) Log.NotImportant(`Slash command "/${name}" registered.`);
                    } catch (err) {
                        Log.Error(`Failed to register the slash command "/${name}": ${err}`);
                    }
                });

                return builder;
            }
        };

        return builder;
    }

    public registerEvent(event: Events | keyof Events, handler: (...args: any[]) => void, options: EventOptions = {}) {
        if (options.once)  this.discordjs_client.once(event as keyof djs.ClientEvents, handler);
        else                this.discordjs_client.on(event as keyof djs.ClientEvents, handler);
    }


    // All private things
    private _getIntents__(ctxintents: (
        "Guilds" | "ManageGuild" | "Voices" | "Messages" | "AutoMod" | "Webhooks" | "Presence" | "Members"
    )[]): number[] {
        const intentMap: Record<string, number> = {
            Guilds: djs.GatewayIntentBits.Guilds,
            ManageGuild: djs.GatewayIntentBits.GuildInvites |
                djs.GatewayIntentBits.GuildModeration |
                djs.GatewayIntentBits.GuildScheduledEvents |
                djs.GatewayIntentBits.GuildExpressions |
                djs.GatewayIntentBits.GuildIntegrations,
            Voices: djs.GatewayIntentBits.GuildVoiceStates,
            Messages: djs.GatewayIntentBits.GuildMessages |
                djs.GatewayIntentBits.MessageContent |
                djs.GatewayIntentBits.DirectMessages |
                djs.GatewayIntentBits.DirectMessageReactions |
                djs.GatewayIntentBits.DirectMessageTyping,
            AutoMod: djs.GatewayIntentBits.AutoModerationConfiguration |
                djs.GatewayIntentBits.AutoModerationExecution,
            Webhooks: djs.GatewayIntentBits.GuildWebhooks,
            Presence: djs.GatewayIntentBits.GuildPresences,
            Members: djs.GatewayIntentBits.GuildMembers,
        };

        return ctxintents.map(name => {
            const intent = intentMap[name];
            if (intent === undefined) {
                throw Log.Error(`❌ Unknown intent alias: "${name}"`);
            }
            return intent;
        });
    }
    private login(): Promise<string> {
        return this.discordjs_client.login(this.token);
    }
}
