import { v4 as uuid } from 'uuid';
import { Request, Response, NextFunction } from 'express';

export function correlationId() {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.headers['x-correlation-id']) {
      req.headers['x-correlation-id'] = uuid();
    }
    next();
  };
}
