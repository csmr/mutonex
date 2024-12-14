require 'logger'
require_relative 'config'

# Initialize logger with the path from environment variables
LOG_PATH = env('LOG_PATH', '/app/log/simtellus.log')
LOGGER = Logger.new(LOG_PATH)

# Custom logging method to prefix log entries with the module name
def log!(message)
  caller_file = caller_locations(1,1)[0].path
  module_name = File.basename(caller_file, ".rb")
  LOGGER.info("#{module_name}: #{message}")
end

