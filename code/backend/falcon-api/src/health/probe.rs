//! `api --health`: the container healthcheck (template §20.2 note).
//!
//! The distroless image has no shell, `curl` or `wget`, so the binary checks
//! itself: `GET http://127.0.0.1:$PORT/api/health`, exit 0 on HTTP 200, else 1.
//! Plain std and a hand-written HTTP/1.1 request, so no HTTP client crate is
//! added for one request. Blocking I/O is fine: no async runtime is running.

use std::io::{Read, Write};
use std::net::{SocketAddr, TcpStream};
use std::time::Duration;

use crate::config::Config;

/// Connect, read and write deadline for the probe.
const TIMEOUT: Duration = Duration::from_secs(3);

/// Runs the probe and returns the process exit code (0 healthy, 1 not).
#[must_use]
pub fn run() -> i32 {
    match probe() {
        Ok(true) => 0,
        Ok(false) | Err(_) => 1,
    }
}

fn probe() -> std::io::Result<bool> {
    // Reuse the real config so the probe hits the same port the server bound.
    let Ok(config) = Config::load() else {
        return Ok(false);
    };
    let addr = SocketAddr::from(([127, 0, 0, 1], config.port));

    let mut stream = TcpStream::connect_timeout(&addr, TIMEOUT)?;
    stream.set_read_timeout(Some(TIMEOUT))?;
    stream.set_write_timeout(Some(TIMEOUT))?;
    stream
        .write_all(b"GET /api/health HTTP/1.1\r\nHost: 127.0.0.1\r\nConnection: close\r\n\r\n")?;

    // Only the status line matters ("HTTP/1.1 200 OK"); 64 bytes covers it.
    let mut buf = [0u8; 64];
    let n = stream.read(&mut buf)?;
    let head = String::from_utf8_lossy(&buf[..n]);
    Ok(head.split_whitespace().nth(1) == Some("200"))
}
