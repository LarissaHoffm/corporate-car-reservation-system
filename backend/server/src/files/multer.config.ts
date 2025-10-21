import { diskStorage } from 'multer';
import { extname } from 'path';
import { BadRequestException } from '@nestjs/common';

const ALLOWED = ['.pdf', '.jpg', '.jpeg', '.png'];
const MAX = (Number(process.env.UPLOAD_MAX_SIZE_MB || 10)) * 1024 * 1024;
const DEST = process.env.UPLOADS_DIR || 'uploads'; 

export const multerOptions = {
  limits: { fileSize: MAX },
  fileFilter: (_req, file, cb) => {
    const ext = extname(file.originalname).toLowerCase();
    if (!ALLOWED.includes(ext)) return cb(new BadRequestException('Tipo de arquivo não permitido'), false);
    cb(null, true);
  },
  storage: diskStorage({
    destination: DEST,
    filename: (_req, file, cb) => {
      const safe = file.originalname.replace(/[^a-zA-Z0-9_.-]/g, '_');
      const ext = extname(safe);
      const base = safe.replace(ext, '');
      cb(null, `${Date.now()}_${base}${ext}`);
    },
  }),
};
