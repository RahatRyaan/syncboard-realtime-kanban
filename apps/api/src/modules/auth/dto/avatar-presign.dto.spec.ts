import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { AvatarPresignDto, AVATAR_MAX_BYTES } from './avatar-presign.dto';

function errorsFor(payload: Record<string, unknown>): string[] {
  const dto = plainToInstance(AvatarPresignDto, payload);
  return validateSync(dto, { whitelist: true }).map((e) => e.property);
}

describe('AvatarPresignDto', () => {  const valid = {
    fileName: 'profile-pic.png',
    mimeType: 'image/png',
    size: 120_345,
  };

  it('accepts an ordinary file name', () => {
    // Regression: the fileName rule used @Max, which validates a numeric value.
    // On a string it rejected every input, so avatar upload always failed.
    expect(errorsFor(valid)).toEqual([]);
  });

  it('accepts a file name at the length boundary', () => {
    const name = 'a'.repeat(251) + '.png'; // exactly 255
    expect(name).toHaveLength(255);
    expect(errorsFor({ ...valid, fileName: name })).toEqual([]);
  });

  it('rejects a file name beyond 255 characters', () => {
    expect(errorsFor({ ...valid, fileName: 'a'.repeat(256) })).toContain(
      'fileName',
    );
  });

  it('rejects an empty file name', () => {
    expect(errorsFor({ ...valid, fileName: '' })).toContain('fileName');
  });

  it.each(['image/jpeg', 'image/png', 'image/webp'])(
    'accepts %s',
    (mimeType) => {
      expect(errorsFor({ ...valid, mimeType })).toEqual([]);
    },
  );

  it.each(['image/gif', 'image/svg+xml', 'application/pdf'])(
    'rejects %s',
    (mimeType) => {
      expect(errorsFor({ ...valid, mimeType })).toContain('mimeType');
    },
  );

  it('accepts a file at exactly the size limit', () => {
    expect(errorsFor({ ...valid, size: AVATAR_MAX_BYTES })).toEqual([]);
  });

  it('rejects a file over the size limit', () => {
    expect(errorsFor({ ...valid, size: AVATAR_MAX_BYTES + 1 })).toContain('size');
  });

  it('rejects a non-integer size', () => {
    expect(errorsFor({ ...valid, size: 12.5 })).toContain('size');
  });
});
