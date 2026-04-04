let io = null

export function setIO(socketIO) {
  io = socketIO
}

export function getIO() {
  return io
}

export function broadcast(event, data) {
  if (io) {
    io.emit(event, data)
  }
}
