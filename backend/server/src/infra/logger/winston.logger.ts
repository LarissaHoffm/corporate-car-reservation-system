import { WinstonModule } from 'nest-winston';
import { format, transports } from 'winston';

export const AppLogger = WinstonModule.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: format.combine(
    format.timestamp(),
    format.errors({ stack: true }),
    format.json()
  ),
  transports: [
    new transports.Console()
  ],
});
