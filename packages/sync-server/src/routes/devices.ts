import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import {
  RegisterDeviceRequestSchema,
  type DeviceResponse,
  type ErrorResponse,
} from '../types';
import {
  createDevice,
  findDevicesByAccountId,
  deleteDevice,
} from '../db/client';
import { authMiddleware, getAuthContext } from '../middleware/auth';

const devices = new Hono();

// All device routes require authentication
devices.use('*', authMiddleware);

// List all devices for the authenticated user
devices.get('/', async (c) => {
  try {
    const { accountId } = getAuthContext(c);
    const deviceList = await findDevicesByAccountId(accountId);

    const response: DeviceResponse[] = deviceList.map((device) => ({
      id: device.id,
      name: device.name,
      publicKey: device.public_key,
      lastSeen: device.last_seen ? device.last_seen.toISOString() : null,
      createdAt: device.created_at.toISOString(),
    }));

    return c.json(response, 200);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch devices';
    return c.json<ErrorResponse>({ error: message }, 500);
  }
});

// Register a new device
devices.post(
  '/',
  zValidator('json', RegisterDeviceRequestSchema),
  async (c) => {
    try {
      const { accountId } = getAuthContext(c);
      const { name, publicKey } = c.req.valid('json');

      const device = await createDevice(accountId, name, publicKey);

      const response: DeviceResponse = {
        id: device.id,
        name: device.name,
        publicKey: device.public_key,
        lastSeen: device.last_seen ? device.last_seen.toISOString() : null,
        createdAt: device.created_at.toISOString(),
      };

      return c.json(response, 201);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to register device';
      return c.json<ErrorResponse>({ error: message }, 500);
    }
  }
);

// Delete a device
devices.delete('/:deviceId', async (c) => {
  try {
    const { accountId } = getAuthContext(c);
    const deviceId = c.req.param('deviceId');

    await deleteDevice(deviceId, accountId);

    return c.json({ message: 'Device deleted successfully' }, 200);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete device';
    return c.json<ErrorResponse>({ error: message }, 500);
  }
});

export default devices;
