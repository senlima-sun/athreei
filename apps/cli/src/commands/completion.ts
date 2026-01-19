// Shell completion scripts for athreei CLI
// Outputs raw scripts to stdout - no React components needed

const COMMANDS = {
  auth: ["login", "logout", "status", "token"],
  org: ["list", "switch", "current"],
  mcp: ["list", "create", "update", "delete", "verify", "tools", "env"],
  "mcp env": ["list", "set", "delete"],
  config: ["init", "show", "set", "get", "validate"],
  gateway: ["status", "start", "stop", "logs", "config"],
  "gateway config": ["show", "set"],
  sync: ["status", "diff", "pull", "push"],
  endpoint: ["list", "create", "details", "delete"],
  apikey: ["list", "create", "revoke"],
  completion: ["bash", "zsh", "fish"],
}

const TOP_LEVEL_COMMANDS = Object.keys(COMMANDS).filter(
  (cmd) => !cmd.includes(" ")
)

const COMMON_FLAGS = ["--help", "-h", "--version", "-V"]

// Bash completion script
export function generateBashCompletion(): string {
  return `# athreei bash completion
# Add to ~/.bashrc:
#   eval "$(athreei completion bash)"

_athreei_completions() {
    local cur prev words cword
    _init_completion || return

    local commands="${TOP_LEVEL_COMMANDS.join(" ")}"

    # Auth subcommands
    local auth_commands="${COMMANDS.auth.join(" ")}"
    # Org subcommands
    local org_commands="${COMMANDS.org.join(" ")}"
    # MCP subcommands
    local mcp_commands="${COMMANDS.mcp.join(" ")}"
    # MCP env subcommands
    local mcp_env_commands="${COMMANDS["mcp env"].join(" ")}"
    # Config subcommands
    local config_commands="${COMMANDS.config.join(" ")}"
    # Gateway subcommands
    local gateway_commands="${COMMANDS.gateway.join(" ")}"
    # Gateway config subcommands
    local gateway_config_commands="${COMMANDS["gateway config"].join(" ")}"
    # Sync subcommands
    local sync_commands="${COMMANDS.sync.join(" ")}"
    # Endpoint subcommands
    local endpoint_commands="${COMMANDS.endpoint.join(" ")}"
    # API key subcommands
    local apikey_commands="${COMMANDS.apikey.join(" ")}"
    # Completion subcommands
    local completion_commands="${COMMANDS.completion.join(" ")}"

    # Common flags
    local common_flags="${COMMON_FLAGS.join(" ")}"

    case "\${cword}" in
        1)
            COMPREPLY=($(compgen -W "\${commands} \${common_flags}" -- "\${cur}"))
            ;;
        2)
            case "\${prev}" in
                auth)
                    COMPREPLY=($(compgen -W "\${auth_commands}" -- "\${cur}"))
                    ;;
                org)
                    COMPREPLY=($(compgen -W "\${org_commands}" -- "\${cur}"))
                    ;;
                mcp)
                    COMPREPLY=($(compgen -W "\${mcp_commands}" -- "\${cur}"))
                    ;;
                config)
                    COMPREPLY=($(compgen -W "\${config_commands}" -- "\${cur}"))
                    ;;
                gateway)
                    COMPREPLY=($(compgen -W "\${gateway_commands}" -- "\${cur}"))
                    ;;
                sync)
                    COMPREPLY=($(compgen -W "\${sync_commands}" -- "\${cur}"))
                    ;;
                endpoint)
                    COMPREPLY=($(compgen -W "\${endpoint_commands}" -- "\${cur}"))
                    ;;
                apikey)
                    COMPREPLY=($(compgen -W "\${apikey_commands}" -- "\${cur}"))
                    ;;
                completion)
                    COMPREPLY=($(compgen -W "\${completion_commands}" -- "\${cur}"))
                    ;;
            esac
            ;;
        3)
            # Handle nested subcommands (mcp env, gateway config)
            case "\${words[1]}" in
                mcp)
                    if [[ "\${words[2]}" == "env" ]]; then
                        COMPREPLY=($(compgen -W "\${mcp_env_commands}" -- "\${cur}"))
                    fi
                    ;;
                gateway)
                    if [[ "\${words[2]}" == "config" ]]; then
                        COMPREPLY=($(compgen -W "\${gateway_config_commands}" -- "\${cur}"))
                    fi
                    ;;
            esac
            ;;
    esac

    # Add common flags to all completions
    if [[ "\${cur}" == -* ]]; then
        case "\${words[1]}" in
            mcp)
                case "\${words[2]}" in
                    list)
                        COMPREPLY=($(compgen -W "--search -s --status --transport --help" -- "\${cur}"))
                        ;;
                    create)
                        COMPREPLY=($(compgen -W "--name -n --description -d --transport -t --command -c --args -a --url -u --help" -- "\${cur}"))
                        ;;
                    update)
                        COMPREPLY=($(compgen -W "--name -n --description -d --transport -t --command -c --args -a --url -u --yes -y --help" -- "\${cur}"))
                        ;;
                    delete)
                        COMPREPLY=($(compgen -W "--confirm --help" -- "\${cur}"))
                        ;;
                    verify)
                        COMPREPLY=($(compgen -W "--timeout -t --help" -- "\${cur}"))
                        ;;
                    tools)
                        COMPREPLY=($(compgen -W "--json --help" -- "\${cur}"))
                        ;;
                esac
                ;;
            auth)
                case "\${words[2]}" in
                    login)
                        COMPREPLY=($(compgen -W "--token -t --help" -- "\${cur}"))
                        ;;
                    token)
                        COMPREPLY=($(compgen -W "--no-mask --help" -- "\${cur}"))
                        ;;
                esac
                ;;
            config)
                case "\${words[2]}" in
                    init)
                        COMPREPLY=($(compgen -W "--path -p --help" -- "\${cur}"))
                        ;;
                    show)
                        COMPREPLY=($(compgen -W "--show-secrets --help" -- "\${cur}"))
                        ;;
                esac
                ;;
            gateway)
                case "\${words[2]}" in
                    start)
                        COMPREPLY=($(compgen -W "--port -p --help" -- "\${cur}"))
                        ;;
                    stop)
                        COMPREPLY=($(compgen -W "--force -f --help" -- "\${cur}"))
                        ;;
                    logs)
                        COMPREPLY=($(compgen -W "--follow -f --lines -n --level -l --help" -- "\${cur}"))
                        ;;
                esac
                ;;
            sync)
                case "\${words[2]}" in
                    diff)
                        COMPREPLY=($(compgen -W "--json --help" -- "\${cur}"))
                        ;;
                    pull|push)
                        COMPREPLY=($(compgen -W "--yes -y --help" -- "\${cur}"))
                        ;;
                esac
                ;;
            endpoint)
                case "\${words[2]}" in
                    list)
                        COMPREPLY=($(compgen -W "--json --help" -- "\${cur}"))
                        ;;
                    create)
                        COMPREPLY=($(compgen -W "--name -n --slug -s --namespace --help" -- "\${cur}"))
                        ;;
                    delete)
                        COMPREPLY=($(compgen -W "--confirm --help" -- "\${cur}"))
                        ;;
                esac
                ;;
            apikey)
                case "\${words[2]}" in
                    list)
                        COMPREPLY=($(compgen -W "--endpoint -e --json --help" -- "\${cur}"))
                        ;;
                    create)
                        COMPREPLY=($(compgen -W "--name -n --endpoint -e --expires --help" -- "\${cur}"))
                        ;;
                    revoke)
                        COMPREPLY=($(compgen -W "--endpoint -e --confirm --help" -- "\${cur}"))
                        ;;
                esac
                ;;
            *)
                COMPREPLY=($(compgen -W "\${common_flags}" -- "\${cur}"))
                ;;
        esac
    fi

    return 0
}

complete -F _athreei_completions athreei
`
}

// Zsh completion script
export function generateZshCompletion(): string {
  return `#compdef athreei

# athreei zsh completion
# Add to ~/.zshrc:
#   eval "$(athreei completion zsh)"

_athreei() {
    local -a commands
    local -a subcommands

    commands=(
        "auth:Manage authentication"
        "org:Manage organizations"
        "mcp:Manage MCP servers"
        "config:Manage configuration files"
        "gateway:Manage the local MCP gateway"
        "sync:Synchronize local config with cloud organization"
        "endpoint:Manage endpoints (MCP server aggregations with API keys)"
        "apikey:Manage API keys for endpoints"
        "completion:Generate shell completion scripts"
    )

    _arguments -C \\
        "1: :->command" \\
        "2: :->subcommand" \\
        "3: :->nested" \\
        "*::arg:->args"

    case "$state" in
        command)
            _describe -t commands "athreei commands" commands
            ;;
        subcommand)
            case "$words[2]" in
                auth)
                    subcommands=(
                        "login:Authenticate with a provider"
                        "logout:Log out from a provider"
                        "status:Show authentication status"
                        "token:Print the current access token"
                    )
                    _describe -t subcommands "auth subcommands" subcommands
                    ;;
                org)
                    subcommands=(
                        "list:List available organizations"
                        "switch:Switch active organization"
                        "current:Show current organization"
                    )
                    _describe -t subcommands "org subcommands" subcommands
                    ;;
                mcp)
                    subcommands=(
                        "list:List configured MCP servers"
                        "create:Create a new MCP server"
                        "update:Update an existing MCP server"
                        "delete:Delete an MCP server"
                        "verify:Verify MCP server connectivity"
                        "tools:List tools exposed by an MCP server"
                        "env:Manage MCP server environment variables"
                    )
                    _describe -t subcommands "mcp subcommands" subcommands
                    ;;
                config)
                    subcommands=(
                        "init:Initialize a new athreei.config.json file"
                        "show:Display current configuration"
                        "set:Set a configuration value"
                        "get:Get a configuration value"
                        "validate:Validate configuration file against schema"
                    )
                    _describe -t subcommands "config subcommands" subcommands
                    ;;
                gateway)
                    subcommands=(
                        "status:Check if the gateway is running"
                        "start:Start the gateway process"
                        "stop:Stop the gateway process"
                        "logs:View gateway logs"
                        "config:Manage gateway configuration"
                    )
                    _describe -t subcommands "gateway subcommands" subcommands
                    ;;
                sync)
                    subcommands=(
                        "status:Check sync status"
                        "diff:Show detailed differences"
                        "pull:Pull configurations from cloud"
                        "push:Push configurations to cloud"
                    )
                    _describe -t subcommands "sync subcommands" subcommands
                    ;;
                endpoint)
                    subcommands=(
                        "list:List configured endpoints"
                        "create:Create a new endpoint"
                        "details:Show endpoint details"
                        "delete:Delete an endpoint"
                    )
                    _describe -t subcommands "endpoint subcommands" subcommands
                    ;;
                apikey)
                    subcommands=(
                        "list:List API keys for an endpoint"
                        "create:Create a new API key"
                        "revoke:Revoke an API key"
                    )
                    _describe -t subcommands "apikey subcommands" subcommands
                    ;;
                completion)
                    subcommands=(
                        "bash:Generate bash completion script"
                        "zsh:Generate zsh completion script"
                        "fish:Generate fish completion script"
                    )
                    _describe -t subcommands "completion subcommands" subcommands
                    ;;
            esac
            ;;
        nested)
            case "$words[2]" in
                mcp)
                    if [[ "$words[3]" == "env" ]]; then
                        subcommands=(
                            "list:List environment variables"
                            "set:Set an environment variable"
                            "delete:Delete an environment variable"
                        )
                        _describe -t subcommands "mcp env subcommands" subcommands
                    fi
                    ;;
                gateway)
                    if [[ "$words[3]" == "config" ]]; then
                        subcommands=(
                            "show:Display gateway configuration"
                            "set:Set a gateway configuration value"
                        )
                        _describe -t subcommands "gateway config subcommands" subcommands
                    fi
                    ;;
            esac
            ;;
        args)
            case "$words[2]" in
                mcp)
                    case "$words[3]" in
                        list)
                            _arguments \\
                                "--search[Search by name or description]:query:" \\
                                "-s[Search by name or description]:query:" \\
                                "--status[Filter by status]:status:(active inactive pending)" \\
                                "--transport[Filter by transport]:transport:(stdio sse streamable-http)" \\
                                "--help[Show help]"
                            ;;
                        create)
                            _arguments \\
                                "--name[Server name]:name:" \\
                                "-n[Server name]:name:" \\
                                "--description[Server description]:description:" \\
                                "-d[Server description]:description:" \\
                                "--transport[Transport type]:transport:(stdio sse streamable-http)" \\
                                "-t[Transport type]:transport:(stdio sse streamable-http)" \\
                                "--command[Command to run]:command:" \\
                                "-c[Command to run]:command:" \\
                                "--args[Arguments for command]:args:" \\
                                "-a[Arguments for command]:args:" \\
                                "--url[Server URL]:url:" \\
                                "-u[Server URL]:url:" \\
                                "--help[Show help]"
                            ;;
                        update|delete|verify|tools)
                            _arguments \\
                                "1:id:" \\
                                "--help[Show help]"
                            ;;
                    esac
                    ;;
                auth)
                    case "$words[3]" in
                        login)
                            _arguments \\
                                "1:provider:(athreei github google)" \\
                                "--token[Use a personal access token]:token:" \\
                                "-t[Use a personal access token]:token:" \\
                                "--help[Show help]"
                            ;;
                    esac
                    ;;
                config)
                    case "$words[3]" in
                        init)
                            _arguments \\
                                "--path[Custom path for config file]:path:_files" \\
                                "-p[Custom path for config file]:path:_files" \\
                                "--help[Show help]"
                            ;;
                        show)
                            _arguments \\
                                "--show-secrets[Reveal sensitive values]" \\
                                "--help[Show help]"
                            ;;
                        set|get)
                            _arguments \\
                                "1:key:(version apiUrl defaultOrg gateway.port gateway.logLevel)" \\
                                "--help[Show help]"
                            ;;
                    esac
                    ;;
                gateway)
                    case "$words[3]" in
                        start)
                            _arguments \\
                                "--port[Port to run on]:port:" \\
                                "-p[Port to run on]:port:" \\
                                "--help[Show help]"
                            ;;
                        stop)
                            _arguments \\
                                "--force[Force kill]" \\
                                "-f[Force kill]" \\
                                "--help[Show help]"
                            ;;
                        logs)
                            _arguments \\
                                "--follow[Follow log output]" \\
                                "-f[Follow log output]" \\
                                "--lines[Number of lines]:lines:" \\
                                "-n[Number of lines]:lines:" \\
                                "--level[Filter by log level]:level:(error warn info debug)" \\
                                "-l[Filter by log level]:level:(error warn info debug)" \\
                                "--help[Show help]"
                            ;;
                    esac
                    ;;
                sync)
                    case "$words[3]" in
                        diff)
                            _arguments \\
                                "--json[Output in JSON format]" \\
                                "--help[Show help]"
                            ;;
                        pull|push)
                            _arguments \\
                                "--yes[Skip confirmation prompts]" \\
                                "-y[Skip confirmation prompts]" \\
                                "--help[Show help]"
                            ;;
                    esac
                    ;;
                endpoint)
                    case "$words[3]" in
                        list)
                            _arguments \\
                                "--json[Output in JSON format]" \\
                                "--help[Show help]"
                            ;;
                        create)
                            _arguments \\
                                "--name[Endpoint name]:name:" \\
                                "-n[Endpoint name]:name:" \\
                                "--slug[Endpoint slug]:slug:" \\
                                "-s[Endpoint slug]:slug:" \\
                                "--namespace[Namespace ID]:namespace:" \\
                                "--help[Show help]"
                            ;;
                        delete)
                            _arguments \\
                                "1:id:" \\
                                "--confirm[Skip interactive confirmation]" \\
                                "--help[Show help]"
                            ;;
                    esac
                    ;;
                apikey)
                    case "$words[3]" in
                        list)
                            _arguments \\
                                "--endpoint[Endpoint ID]:endpoint:" \\
                                "-e[Endpoint ID]:endpoint:" \\
                                "--json[Output in JSON format]" \\
                                "--help[Show help]"
                            ;;
                        create)
                            _arguments \\
                                "--name[API key name]:name:" \\
                                "-n[API key name]:name:" \\
                                "--endpoint[Endpoint ID]:endpoint:" \\
                                "-e[Endpoint ID]:endpoint:" \\
                                "--expires[Expiration date]:expires:" \\
                                "--help[Show help]"
                            ;;
                        revoke)
                            _arguments \\
                                "1:id:" \\
                                "--endpoint[Endpoint ID]:endpoint:" \\
                                "-e[Endpoint ID]:endpoint:" \\
                                "--confirm[Skip interactive confirmation]" \\
                                "--help[Show help]"
                            ;;
                    esac
                    ;;
            esac
            ;;
    esac
}

compdef _athreei athreei
`
}

// Fish completion script
export function generateFishCompletion(): string {
  return `# athreei fish completion
# Add to ~/.config/fish/config.fish:
#   athreei completion fish | source

# Disable file completion by default
complete -c athreei -f

# Top-level commands
complete -c athreei -n "__fish_use_subcommand" -a "auth" -d "Manage authentication"
complete -c athreei -n "__fish_use_subcommand" -a "org" -d "Manage organizations"
complete -c athreei -n "__fish_use_subcommand" -a "mcp" -d "Manage MCP servers"
complete -c athreei -n "__fish_use_subcommand" -a "config" -d "Manage configuration files"
complete -c athreei -n "__fish_use_subcommand" -a "gateway" -d "Manage the local MCP gateway"
complete -c athreei -n "__fish_use_subcommand" -a "sync" -d "Synchronize local config with cloud"
complete -c athreei -n "__fish_use_subcommand" -a "endpoint" -d "Manage endpoints"
complete -c athreei -n "__fish_use_subcommand" -a "apikey" -d "Manage API keys"
complete -c athreei -n "__fish_use_subcommand" -a "completion" -d "Generate shell completion scripts"

# Auth subcommands
complete -c athreei -n "__fish_seen_subcommand_from auth" -a "login" -d "Authenticate with a provider"
complete -c athreei -n "__fish_seen_subcommand_from auth" -a "logout" -d "Log out from a provider"
complete -c athreei -n "__fish_seen_subcommand_from auth" -a "status" -d "Show authentication status"
complete -c athreei -n "__fish_seen_subcommand_from auth" -a "token" -d "Print the current access token"

# Auth login options
complete -c athreei -n "__fish_seen_subcommand_from auth; and __fish_seen_subcommand_from login" -s t -l token -d "Use a personal access token"

# Auth token options
complete -c athreei -n "__fish_seen_subcommand_from auth; and __fish_seen_subcommand_from token" -l no-mask -d "Print full token"

# Org subcommands
complete -c athreei -n "__fish_seen_subcommand_from org" -a "list" -d "List available organizations"
complete -c athreei -n "__fish_seen_subcommand_from org" -a "switch" -d "Switch active organization"
complete -c athreei -n "__fish_seen_subcommand_from org" -a "current" -d "Show current organization"

# MCP subcommands
complete -c athreei -n "__fish_seen_subcommand_from mcp" -a "list" -d "List configured MCP servers"
complete -c athreei -n "__fish_seen_subcommand_from mcp" -a "create" -d "Create a new MCP server"
complete -c athreei -n "__fish_seen_subcommand_from mcp" -a "update" -d "Update an existing MCP server"
complete -c athreei -n "__fish_seen_subcommand_from mcp" -a "delete" -d "Delete an MCP server"
complete -c athreei -n "__fish_seen_subcommand_from mcp" -a "verify" -d "Verify MCP server connectivity"
complete -c athreei -n "__fish_seen_subcommand_from mcp" -a "tools" -d "List tools exposed by an MCP server"
complete -c athreei -n "__fish_seen_subcommand_from mcp" -a "env" -d "Manage environment variables"

# MCP list options
complete -c athreei -n "__fish_seen_subcommand_from mcp; and __fish_seen_subcommand_from list" -s s -l search -d "Search by name or description"
complete -c athreei -n "__fish_seen_subcommand_from mcp; and __fish_seen_subcommand_from list" -l status -d "Filter by status" -a "active inactive pending"
complete -c athreei -n "__fish_seen_subcommand_from mcp; and __fish_seen_subcommand_from list" -l transport -d "Filter by transport" -a "stdio sse streamable-http"

# MCP create options
complete -c athreei -n "__fish_seen_subcommand_from mcp; and __fish_seen_subcommand_from create" -s n -l name -d "Server name"
complete -c athreei -n "__fish_seen_subcommand_from mcp; and __fish_seen_subcommand_from create" -s d -l description -d "Server description"
complete -c athreei -n "__fish_seen_subcommand_from mcp; and __fish_seen_subcommand_from create" -s t -l transport -d "Transport type" -a "stdio sse streamable-http"
complete -c athreei -n "__fish_seen_subcommand_from mcp; and __fish_seen_subcommand_from create" -s c -l command -d "Command to run"
complete -c athreei -n "__fish_seen_subcommand_from mcp; and __fish_seen_subcommand_from create" -s a -l args -d "Arguments for command"
complete -c athreei -n "__fish_seen_subcommand_from mcp; and __fish_seen_subcommand_from create" -s u -l url -d "Server URL"

# MCP update options
complete -c athreei -n "__fish_seen_subcommand_from mcp; and __fish_seen_subcommand_from update" -s n -l name -d "New server name"
complete -c athreei -n "__fish_seen_subcommand_from mcp; and __fish_seen_subcommand_from update" -s d -l description -d "New description"
complete -c athreei -n "__fish_seen_subcommand_from mcp; and __fish_seen_subcommand_from update" -s t -l transport -d "Transport type" -a "stdio sse streamable-http"
complete -c athreei -n "__fish_seen_subcommand_from mcp; and __fish_seen_subcommand_from update" -s c -l command -d "Command to run"
complete -c athreei -n "__fish_seen_subcommand_from mcp; and __fish_seen_subcommand_from update" -s a -l args -d "Arguments for command"
complete -c athreei -n "__fish_seen_subcommand_from mcp; and __fish_seen_subcommand_from update" -s u -l url -d "Server URL"
complete -c athreei -n "__fish_seen_subcommand_from mcp; and __fish_seen_subcommand_from update" -s y -l yes -d "Skip confirmation prompt"

# MCP delete options
complete -c athreei -n "__fish_seen_subcommand_from mcp; and __fish_seen_subcommand_from delete" -l confirm -d "Skip interactive confirmation"

# MCP verify options
complete -c athreei -n "__fish_seen_subcommand_from mcp; and __fish_seen_subcommand_from verify" -s t -l timeout -d "Connection timeout in milliseconds"

# MCP tools options
complete -c athreei -n "__fish_seen_subcommand_from mcp; and __fish_seen_subcommand_from tools" -l json -d "Output in JSON format"

# MCP env subcommands
complete -c athreei -n "__fish_seen_subcommand_from mcp; and __fish_seen_subcommand_from env" -a "list" -d "List environment variables"
complete -c athreei -n "__fish_seen_subcommand_from mcp; and __fish_seen_subcommand_from env" -a "set" -d "Set an environment variable"
complete -c athreei -n "__fish_seen_subcommand_from mcp; and __fish_seen_subcommand_from env" -a "delete" -d "Delete an environment variable"

# MCP env list options
complete -c athreei -n "__fish_seen_subcommand_from env; and __fish_seen_subcommand_from list" -l show -d "Reveal environment variable values"

# MCP env delete options
complete -c athreei -n "__fish_seen_subcommand_from env; and __fish_seen_subcommand_from delete" -l confirm -d "Skip interactive confirmation"

# Config subcommands
complete -c athreei -n "__fish_seen_subcommand_from config" -a "init" -d "Initialize a new athreei.config.json file"
complete -c athreei -n "__fish_seen_subcommand_from config" -a "show" -d "Display current configuration"
complete -c athreei -n "__fish_seen_subcommand_from config" -a "set" -d "Set a configuration value"
complete -c athreei -n "__fish_seen_subcommand_from config" -a "get" -d "Get a configuration value"
complete -c athreei -n "__fish_seen_subcommand_from config" -a "validate" -d "Validate configuration file"

# Config init options
complete -c athreei -n "__fish_seen_subcommand_from config; and __fish_seen_subcommand_from init" -s p -l path -d "Custom path for config file" -r

# Config show options
complete -c athreei -n "__fish_seen_subcommand_from config; and __fish_seen_subcommand_from show" -l show-secrets -d "Reveal sensitive values"

# Gateway subcommands
complete -c athreei -n "__fish_seen_subcommand_from gateway" -a "status" -d "Check if the gateway is running"
complete -c athreei -n "__fish_seen_subcommand_from gateway" -a "start" -d "Start the gateway process"
complete -c athreei -n "__fish_seen_subcommand_from gateway" -a "stop" -d "Stop the gateway process"
complete -c athreei -n "__fish_seen_subcommand_from gateway" -a "logs" -d "View gateway logs"
complete -c athreei -n "__fish_seen_subcommand_from gateway" -a "config" -d "Manage gateway configuration"

# Gateway start options
complete -c athreei -n "__fish_seen_subcommand_from gateway; and __fish_seen_subcommand_from start" -s p -l port -d "Port to run the gateway on"

# Gateway stop options
complete -c athreei -n "__fish_seen_subcommand_from gateway; and __fish_seen_subcommand_from stop" -s f -l force -d "Force kill the gateway"

# Gateway logs options
complete -c athreei -n "__fish_seen_subcommand_from gateway; and __fish_seen_subcommand_from logs" -s f -l follow -d "Follow log output"
complete -c athreei -n "__fish_seen_subcommand_from gateway; and __fish_seen_subcommand_from logs" -s n -l lines -d "Number of lines to show"
complete -c athreei -n "__fish_seen_subcommand_from gateway; and __fish_seen_subcommand_from logs" -s l -l level -d "Filter by log level" -a "error warn info debug"

# Gateway config subcommands
complete -c athreei -n "__fish_seen_subcommand_from gateway; and __fish_seen_subcommand_from config" -a "show" -d "Display gateway configuration"
complete -c athreei -n "__fish_seen_subcommand_from gateway; and __fish_seen_subcommand_from config" -a "set" -d "Set a gateway configuration value"

# Sync subcommands
complete -c athreei -n "__fish_seen_subcommand_from sync" -a "status" -d "Check sync status"
complete -c athreei -n "__fish_seen_subcommand_from sync" -a "diff" -d "Show detailed differences"
complete -c athreei -n "__fish_seen_subcommand_from sync" -a "pull" -d "Pull configurations from cloud"
complete -c athreei -n "__fish_seen_subcommand_from sync" -a "push" -d "Push configurations to cloud"

# Sync diff options
complete -c athreei -n "__fish_seen_subcommand_from sync; and __fish_seen_subcommand_from diff" -l json -d "Output in JSON format"

# Sync pull/push options
complete -c athreei -n "__fish_seen_subcommand_from sync; and __fish_seen_subcommand_from pull" -s y -l yes -d "Skip confirmation prompts"
complete -c athreei -n "__fish_seen_subcommand_from sync; and __fish_seen_subcommand_from push" -s y -l yes -d "Skip confirmation prompts"
complete -c athreei -n "__fish_seen_subcommand_from sync; and __fish_seen_subcommand_from push" -l delete -d "Delete cloud servers not in local config"

# Endpoint subcommands
complete -c athreei -n "__fish_seen_subcommand_from endpoint" -a "list" -d "List configured endpoints"
complete -c athreei -n "__fish_seen_subcommand_from endpoint" -a "create" -d "Create a new endpoint"
complete -c athreei -n "__fish_seen_subcommand_from endpoint" -a "details" -d "Show endpoint details"
complete -c athreei -n "__fish_seen_subcommand_from endpoint" -a "delete" -d "Delete an endpoint"

# Endpoint list options
complete -c athreei -n "__fish_seen_subcommand_from endpoint; and __fish_seen_subcommand_from list" -l json -d "Output in JSON format"

# Endpoint create options
complete -c athreei -n "__fish_seen_subcommand_from endpoint; and __fish_seen_subcommand_from create" -s n -l name -d "Endpoint name"
complete -c athreei -n "__fish_seen_subcommand_from endpoint; and __fish_seen_subcommand_from create" -s s -l slug -d "Endpoint slug"
complete -c athreei -n "__fish_seen_subcommand_from endpoint; and __fish_seen_subcommand_from create" -l namespace -d "Namespace ID"

# Endpoint delete options
complete -c athreei -n "__fish_seen_subcommand_from endpoint; and __fish_seen_subcommand_from delete" -l confirm -d "Skip interactive confirmation"

# API key subcommands
complete -c athreei -n "__fish_seen_subcommand_from apikey" -a "list" -d "List API keys for an endpoint"
complete -c athreei -n "__fish_seen_subcommand_from apikey" -a "create" -d "Create a new API key"
complete -c athreei -n "__fish_seen_subcommand_from apikey" -a "revoke" -d "Revoke an API key"

# API key list options
complete -c athreei -n "__fish_seen_subcommand_from apikey; and __fish_seen_subcommand_from list" -s e -l endpoint -d "Endpoint ID to filter by"
complete -c athreei -n "__fish_seen_subcommand_from apikey; and __fish_seen_subcommand_from list" -l json -d "Output in JSON format"

# API key create options
complete -c athreei -n "__fish_seen_subcommand_from apikey; and __fish_seen_subcommand_from create" -s n -l name -d "API key name"
complete -c athreei -n "__fish_seen_subcommand_from apikey; and __fish_seen_subcommand_from create" -s e -l endpoint -d "Endpoint ID"
complete -c athreei -n "__fish_seen_subcommand_from apikey; and __fish_seen_subcommand_from create" -l expires -d "Expiration date"

# API key revoke options
complete -c athreei -n "__fish_seen_subcommand_from apikey; and __fish_seen_subcommand_from revoke" -s e -l endpoint -d "Endpoint ID"
complete -c athreei -n "__fish_seen_subcommand_from apikey; and __fish_seen_subcommand_from revoke" -l confirm -d "Skip interactive confirmation"

# Completion subcommands
complete -c athreei -n "__fish_seen_subcommand_from completion" -a "bash" -d "Generate bash completion script"
complete -c athreei -n "__fish_seen_subcommand_from completion" -a "zsh" -d "Generate zsh completion script"
complete -c athreei -n "__fish_seen_subcommand_from completion" -a "fish" -d "Generate fish completion script"

# Global options
complete -c athreei -s h -l help -d "Show help"
complete -c athreei -s V -l version -d "Show version"
complete -c athreei -s p -l profile -d "Use a specific profile"
`
}

export function outputBashCompletion(): void {
  process.stdout.write(generateBashCompletion())
}

export function outputZshCompletion(): void {
  process.stdout.write(generateZshCompletion())
}

export function outputFishCompletion(): void {
  process.stdout.write(generateFishCompletion())
}
