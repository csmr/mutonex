require 'logger'
require_relative 'config'

LOG_DISABLE = env('SIM_LOG_DISABLE', 'true')
p "[ #{$0} (and planet & sim) ] LOG_DISABLE: " + LOG_DISABLE

if LOG_DISABLE == 'false'
  LOG_PATH = env('SIM_LOG_PATH', '/app/log/simtellus.log')
  LOGGER = Logger.new(LOG_PATH)

  # Custom logging method to prefix log entries with the module name
  def log!(message)
    return if LOG_DISABLE == 'true'

    caller_file = caller_locations(1, 1)[0].path
    module_name = File.basename(caller_file, '.rb')
    LOGGER.info("#{module_name}: #{message}")
  end
else
  def log!(msg); end
end
