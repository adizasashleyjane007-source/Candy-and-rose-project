import { NextResponse, type NextRequest } from 'next/server';
import {
  getNowInTimezone,
  parseSlotToMinutes,
  DEFAULT_SALON_TIMEZONE,
} from '@/lib/timezone';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { date, time, timezone, hairstyleImage } = body || {};

    // Validate optional hairstyle reference image format (PNG, JPG, JPEG only)
    if (hairstyleImage && typeof hairstyleImage === 'object') {
      const fileName = String(hairstyleImage.name || '');
      const mimeType = String(hairstyleImage.type || '').toLowerCase();
      const fileSize = Number(hairstyleImage.size || 0);
      const ext = fileName.split('.').pop()?.toLowerCase() || '';

      const allowedExts = ['png', 'jpg', 'jpeg'];
      const allowedMimes = ['image/png', 'image/jpeg', 'image/jpg'];

      if (!allowedExts.includes(ext) || !allowedMimes.includes(mimeType)) {
        return NextResponse.json(
          {
            valid: false,
            error: 'Unsupported file format. Only PNG, JPG, and JPEG images are accepted.',
          },
          { status: 400 }
        );
      }

      if (fileSize > 5 * 1024 * 1024) {
        return NextResponse.json(
          {
            valid: false,
            error: 'File size exceeds the 5 MB limit. Please upload an image under 5 MB.',
          },
          { status: 400 }
        );
      }
    }

    if (!date || !time) {
      return NextResponse.json(
        { valid: false, error: 'Missing date or time parameter.' },
        { status: 400 }
      );
    }

    const safeTz = timezone || DEFAULT_SALON_TIMEZONE;
    const current = getNowInTimezone(safeTz);
    const slotMinutes = parseSlotToMinutes(time);

    if (slotMinutes === -1) {
      return NextResponse.json(
        { valid: false, error: 'Invalid time format. Please provide a valid time (e.g. 02:00 PM).' },
        { status: 400 }
      );
    }

    // 1. Date is in the past
    if (date < current.dateStr) {
      return NextResponse.json(
        {
          valid: false,
          error: 'The selected date has already passed. Please select a future date.',
          serverDate: current.dateStr,
        },
        { status: 400 }
      );
    }

    // 2. Date is today: slot time must be strictly in the future
    if (date === current.dateStr && slotMinutes <= current.timeMinutes) {
      return NextResponse.json(
        {
          valid: false,
          error: 'The selected time slot has already passed. Please select an upcoming time slot.',
          serverDate: current.dateStr,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      valid: true,
      message: 'Booking date and time are valid.',
      serverDate: current.dateStr,
    });
  } catch (err: any) {
    return NextResponse.json(
      { valid: false, error: err?.message || 'Validation failed.' },
      { status: 500 }
    );
  }
}
