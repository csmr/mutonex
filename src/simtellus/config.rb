require 'dotenv/load'

# Load environment variables from .env file
Dotenv.load

# Define a method to get environment variables
def env(key, default = nil)
  ENV.fetch(key, default)
end