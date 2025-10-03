import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

/**
 * GET /api/debug/list-yamls
 *
 * Lists all available YAML configuration files in config/tenants/
 */
export async function GET() {
  try {
    const tenantsDir = path.join(process.cwd(), 'config', 'tenants');

    // Read directory
    const files = await fs.readdir(tenantsDir);

    // Filter for YAML files
    const yamlFiles = files
      .filter(file => file.endsWith('.yaml') || file.endsWith('.yml'))
      .map(file => `config/tenants/${file}`);

    return NextResponse.json({
      success: true,
      files: yamlFiles,
      count: yamlFiles.length,
    });
  } catch (error) {
    console.error('Error listing YAML files:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to list YAML files',
        files: [],
      },
      { status: 500 }
    );
  }
}
