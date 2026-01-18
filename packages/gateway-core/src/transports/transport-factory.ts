/**
 * Transport Factory
 *
 * Provides a unified interface for creating MCP transport connections
 * regardless of the underlying transport type (stdio or HTTP).
 */

import type {
  TransportConfig,
  TransportConnection,
  TransportStatus,
} from "../types/transports"
import { StdioTransportManager } from "./stdio-manager"
import { StreamableHttpTransportManager } from "./streamable-http-manager"

export class TransportFactory {
  private stdioManager = new StdioTransportManager()
  private httpManager = new StreamableHttpTransportManager()

  async createConnection(
    id: string,
    config: TransportConfig
  ): Promise<TransportConnection> {
    switch (config.transport) {
      case "stdio":
        return this.stdioManager.connect(id, config)
      case "streamable-http":
        return this.httpManager.connect(id, config)
      default:
        throw new Error(
          `Unknown transport type: ${(config as TransportConfig).transport}`
        )
    }
  }

  getConnection(id: string): TransportConnection | undefined {
    return (
      this.stdioManager.getConnection(id) ?? this.httpManager.getConnection(id)
    )
  }

  getStatus(id: string): TransportStatus | undefined {
    return this.stdioManager.getStatus(id) ?? this.httpManager.getStatus(id)
  }

  isConnected(id: string): boolean {
    return this.stdioManager.isConnected(id) || this.httpManager.isConnected(id)
  }

  getAllConnectionIds(): string[] {
    return [
      ...this.stdioManager.getConnectionIds(),
      ...this.httpManager.getConnectionIds(),
    ]
  }

  async closeConnection(id: string): Promise<void> {
    const stdioConn = this.stdioManager.getConnection(id)
    if (stdioConn) {
      await stdioConn.close()
      return
    }

    const httpConn = this.httpManager.getConnection(id)
    if (httpConn) {
      await httpConn.close()
    }
  }

  async closeAll(): Promise<void> {
    await Promise.all([
      this.stdioManager.disconnectAll(),
      this.httpManager.disconnectAll(),
    ])
  }

  getStdioManager(): StdioTransportManager {
    return this.stdioManager
  }

  getHttpManager(): StreamableHttpTransportManager {
    return this.httpManager
  }
}

export const transportFactory = new TransportFactory()
