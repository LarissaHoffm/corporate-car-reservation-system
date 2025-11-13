import { v4 as uuid } from 'uuid';
import { Request, Response, NextFunction } from 'express';

export function correlationId() {
  return (req: Request, res: Response, next: NextFunction) => {
    let id = req.headers['x-correlation-id'] as string | undefined;
    if (!id) {
      id = uuid();
      (req.headers as any)['x-correlation-id'] = id;
    }
    res.setHeader('x-correlation-id', id);
    next();
  };
}
