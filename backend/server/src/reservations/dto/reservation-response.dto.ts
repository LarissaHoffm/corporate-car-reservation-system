import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  Reservation as PrismaReservation,
  ReservationStatus,
} from '@prisma/client';

export class ReservationResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ format: 'uuid' })
  tenantId: string;

  @ApiPropertyOptional({ format: 'uuid' })
  branchId?: string | null;

  @ApiProperty({ format: 'uuid', description: 'Solicitante (User.id)' })
  userId: string;

  @ApiPropertyOptional({ format: 'uuid', description: 'Aprovador (User.id)' })
  approverId?: string | null;

  @ApiPropertyOptional({
    format: 'uuid',
    description: 'Carro atribuído (Car.id)',
  })
  carId?: string | null;

  @ApiProperty()
  origin: string;

  @ApiProperty()
  destination: string;

  @ApiProperty({ type: String, format: 'date-time' })
  startAt: string;

  @ApiProperty({ type: String, format: 'date-time' })
  endAt: string;

  @ApiProperty({ enum: ReservationStatus, default: ReservationStatus.PENDING })
  status: ReservationStatus;

  @ApiPropertyOptional({ description: 'Finalidade/justificativa' })
  purpose?: string | null;

  @ApiPropertyOptional({ type: String, format: 'date-time' })
  approvedAt?: string | null;

  @ApiPropertyOptional({ type: String, format: 'date-time' })
  canceledAt?: string | null;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt: string;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt: string;
}

export function toReservationResponseDto(
  r: PrismaReservation,
): ReservationResponseDto {
  return {
    id: r.id,
    tenantId: r.tenantId,
    branchId: r.branchId ?? null,
    userId: r.userId,
    approverId: r.approverId ?? null,
    carId: r.carId ?? null,
    origin: r.origin,
    destination: r.destination,
    startAt:
      r.startAt instanceof Date
        ? r.startAt.toISOString()
        : (r.startAt as unknown as string),
    endAt:
      r.endAt instanceof Date
        ? r.endAt.toISOString()
        : (r.endAt as unknown as string),
    status: r.status,
    purpose: r.purpose ?? null,
    approvedAt: r.approvedAt ? new Date(r.approvedAt).toISOString() : null,
    canceledAt: r.canceledAt ? new Date(r.canceledAt).toISOString() : null,
    createdAt:
      r.createdAt instanceof Date
        ? r.createdAt.toISOString()
        : (r.createdAt as unknown as string),
    updatedAt:
      r.updatedAt instanceof Date
        ? r.updatedAt.toISOString()
        : (r.updatedAt as unknown as string),
  };
}

export function toReservationResponseList(
  list: PrismaReservation[],
): ReservationResponseDto[] {
  return list.map(toReservationResponseDto);
}
