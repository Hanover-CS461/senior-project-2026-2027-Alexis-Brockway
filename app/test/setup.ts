import { existsSync } from 'node:fs'

for (const file of ['.env.test', '.env.test.local']) {
  if (existsSync(file)) process.loadEnvFile(file)
}
