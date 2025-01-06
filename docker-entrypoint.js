#!/usr/bin/env node

import { spawn } from 'node:child_process'

const env = { ...process.env }

;(async () => {
  console.log(env.DATABASE_URL);
  // If running the web server then migrate existing database.
  if (process.argv.slice(2).join(' ') === 'npm run start') {
    // Create a modified environment for Prisma

    await exec('npx prisma migrate deploy', env)
  }
  
  // Launch application with original env
  await exec(process.argv.slice(2).join(' '), env)
})()

function exec(command, cmdEnv) {
  const child = spawn(command, { 
    shell: true, 
    stdio: 'inherit', 
    env: cmdEnv 
  })
  return new Promise((resolve, reject) => {
    child.on('exit', (code) => {
      if (code === 0) {
        resolve()
      } else {
        reject(new Error(`${command} failed rc=${code}`))
      }
    })
  })
}
