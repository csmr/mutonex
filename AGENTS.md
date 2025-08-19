# Mutonex Implementation Style

Mutonex is implemented with a functional style where possible, using Elixir, Ruby, and Deno JavaScript interpreters. For development and hosting purposes, each Mutonex component runs in a container defined in `compose.yaml`. The implementation minimizes coupling between modules and especially seeks to minimize coupling and dependencies in test scripts, which should be standalone and exist for each module.

## Elixir Setup

To run Elixir scripts, you need to install Elixir and Erlang.

1.  **Install Elixir and Erlang:**
    ```bash
    curl -fsSO https://elixir-lang.org/install.sh
    sh install.sh elixir@latest otp@latest
    ```

2.  **Update your shell's PATH:**
    Add the following lines to your shell's configuration file (e.g., `~/.bashrc`, `~/.zshrc`) and replace `<version>` with the installed versions from the script's output:
    ```bash
    export PATH=$HOME/.elixir-install/installs/otp/<version>/bin:$PATH
    export PATH=$HOME/.elixir-install/installs/elixir/<version>/bin:$PATH
    ```

3.  **Verify the installation:**
    ```bash
    elixir --version
    ```
