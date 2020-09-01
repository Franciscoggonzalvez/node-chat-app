const path = require('path')
const http = require('http')
const express = require('express')
const socketio = require('socket.io')
const Filter = require('bad-words')
const {gerenateMessage, gerenateLocationMessage} = require('./utils/messages')
const {addUser, removeUser, getUser, getUsersInRoom} = require('./utils/users')

const app = express()
const server = http.createServer(app)
const io = socketio(server)

const port = process.env.PORT || 3000
const publicDirectoryPath = path.join(__dirname, '../public')

app.use(express.static(publicDirectoryPath))

io.on('connection', (socket) => {
    console.log('new socket connection')

    socket.on('join', ({username, room}, callback) => {
        const {error, user} = addUser({id: socket.id, username, room})
        if (error) {
           return callback(error)
        }

        socket.join(user.room)
        //io.to.emit -> envia un mensaje a todos los clientes de una habitación
        //socket.broadcast.to.emit --> envía un mensaje a todos los clientes de la habitación menos al sender
        socket.emit('message', gerenateMessage('Admin','Welcome!'))
        socket.broadcast.to(user.room).emit('message', gerenateMessage('Andmin',`${user.username} has joined!`))
        io.to(user.room).emit('roomData', {
            room: user.room,
            users: getUsersInRoom(user.room)
        })
        callback()
    })

    socket.on('sendMessage', (message, callback) => {
        const user = getUser(socket.id)
        const filter = new Filter()
        if (filter.isProfane(message)) {
            return callback('Profanity is not allowed!')
        }
        //io.emit -> envía a todos los clientes
        io.to(user.room).emit('message', gerenateMessage(user.username, message))
        //si no hay profannity se envía el callback vacío
        callback()
    })

    socket.on('disconnect', () => {

        const user = removeUser(socket.id)

        if (user) {
            io.to(user.room).emit('message', gerenateMessage('Admin',`${user.username} has left!`))
            io.to(user.room).emit('roomData', {
                room: user.room,
                users: getUsersInRoom(user.room)
            })
        }
        
    })

    socket.on('sendLocation', (location, callback) => {
        const user = getUser(socket.id)
        io.to(user.room).emit('locationMessage', gerenateLocationMessage(user.username, `https://google.com/maps?q=${location.latitude},${location.longitude}`))
        callback()
    })

})

server.listen(port, () => {
    console.log(`Server is up on port ${port}`)
})