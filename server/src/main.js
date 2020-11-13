// SOCKETS //
const io = require('socket.io')()
const ONE_DAY = 86400000
const ONE_MINUTE = 60000
const MIN_LAYOVER_MINS = 15
const HUBS = ['MAN', 'LHR']
const FOCUS_CITIES = ['LCY', 'JFK']
// let socket = {emit: () => {console.log("default emit")}};
const addDays = (date, numOfDays) => new Date(date.valueOf() + numOfDays * ONE_DAY)
const addMins = (date, numOfMins) => new Date(date.valueOf() + numOfMins * ONE_MINUTE)

const searchOneStop = (req, hubs, focus) => {
  const specificAirports = []
  if (hubs) specificAirports.push(HUBS)
  if (focus) specificAirports.push(FOCUS_CITIES)
  // First Leg cursor
  const destinationQuery = specificAirports.length > 1 ? { $in: specificAirports } : { $ne: req.destination }
  const firstLeg = db.collection('flights').find(
    // origin && destination && date
    {
      origin: { $eq: req.origin },
      destination: destinationQuery,
      'schedule.departure': { $gte: req.date, $lte: addDays(req.date, 1) }
    },
    { _id: 1, origin: 1, destination: 1, schedule: 1 }
  ).sort({ destination: 1 })

  const matches = [] // Holds any pair of matching single-layover flight itineraries

  // If the origin has no flights on the requested days, then return an empty array
  if (!firstLeg.hasNext()) {
    firstLeg.close()
    return matches
  }

  // Create and populate a hash table of the destinations of all possible outbound flights
  const layoverOptions = {}
  let earliestSecondFlight = addDays(req.date, 7)
  while (firstLeg.hasNext()) {
    const firstFlight = firstLeg.next()
    const dest = firstFlight.destination
    if (layoverOptions[dest] === undefined) layoverOptions[dest] = []
    layoverOptions[dest].push(firstFlight)
    const arrival = addMins(new Date(firstFlight.schedule.departure), firstFlight.schedule.duration)
    if (arrival < earliestSecondFlight) earliestSecondFlight = arrival
  }
  firstLeg.close()

  // Second Leg cursor
  const originQuery = specificAirports.length > 1 ? { $in: specificAirports } : { $ne: req.origin }
  const secondLeg = db.collection('flights').find(
    // destination && origin (date || tomorrow)
    {
      destination: { $eq: req.destination },
      origin: originQuery,
      'schedule.departure': { $gte: earliestSecondFlight, $lte: addDays(earliestSecondFlight, 1) }
    },
    { _id: 1, origin: 1, destination: 1, schedule: 1 }
  ).sort({ origin: 1 })

  while (secondLeg.hasNext()) {
    const secondFlight = secondLeg.next()
    const layoverAirport = secondFlight.origin
    // If the second flight's origin does not have any incoming flights from travel origin, then continue
    if (!layoverOptions[layoverAirport]) continue
    // Else: loop through destinations of all possible first flights and check compatibility
    layoverOptions[layoverAirport].forEach(firstFlight => {
      const layoverArrival = addMins(firstFlight.schedule.departure, firstFlight.schedule.duration + MIN_LAYOVER_MINS)
      if (secondFlight.schedule.departure >= layoverArrival) {
        matches.push([firstFlight, secondFlight])
      }
    })
  }
  secondLeg.close()
  return matches
}

// const searchOneStop2 = (req) => {
//   const firstLeg = db.collection('flights').find(
//     // origin && date && !destination
//     {
//       $and: [
//         { origin: { $eq: req.origin } },
//         { date: { $eq: req.date.toISOString() } },
//         { destination: { $ne: req.destination } }
//       ]
//     },
//     { _id: 0, public: 0 }
//   ).sort({ destination: 1, 'schedule.departure': 1 })
//
//   // Second Leg cursor
//   const secondLeg = db.collection('flights').find(
//     // destination && (date || tomorrow) && !origin
//     {
//       $and: [
//         { destination: { $eq: req.origin } },
//         {
//           $or: [
//             { date: { $eq: req.date.toISOString() } },
//             { date: { $eq: new Date(req.date.valueOf() + ONE_DAY).toISOString() } }
//           ]
//         },
//         { origin: { $ne: req.origin } }
//       ]
//     },
//     { _id: 0, public: 0 }
//   ).sort({ origin: 1, 'schedule.departure': 1 })
//
//   const potentialOutbound = {}
//   const potentialReturn = {}
//   const outCount = 0
//   const returnCount = 0
//   const potentialAirports = []
//   const matches = []
//
//   if (!firstLeg.hasNext() || !secondLeg.hasNext()) {
//     return matches
//   }
//   let one = firstLeg.next()
//   let two = secondLeg.next()
//
//   do {
//     const comparison = one.destination.localeCompare(two.origin)
//     if () {
//
//     }
//
//     if (comparison === 1 && secondLeg.hasNext()) {
//       two = secondLeg.next()
//     } else if (comparison === -1 && firstLeg.hasNext()) {
//       one = firstLeg.next()
//     } else {
//       const airport = one.destination
//       if (!potentialOutbound[airport]) {
//         potentialOutbound[airport] = []
//       }
//       potentialOutbound[airport].push(one)
//
//       if (!potentialReturn[airport]) {
//         potentialReturn[airport] = []
//       }
//       potentialReturn[airport].push(two)
//
//       potentialAirports.push(airport)
//
//       if (firstLeg.hasNext()) one = firstLeg.next()
//       if (secondLeg.hasNext()) two = secondLeg.next()
//     }
//   } while (firstLeg.hasNext() || secondLeg.hasNext())
//
//   potentialAirports.forEach(airport => {
//     potentialOutbound[airport].forEach(out => {
//       potentialReturn[airport].forEach(ret => {
//
//       })
//     })
//   })
//
//   return matches
// }

io.on('connect', (socket) => {
  console.log('Connected to client')
  socket.on('customEmit', data => {
    console.log('Received message from client:')
    console.log(data)
  })

  // Send client list of airports and cities
  socket.on('fetchAirports', (data) => {
    const EVENT = 'fetchAirports'
    if (!db) {
      socket.emit(EVENT, 'Could not connect to database')
      return
    }
    db.collection('airports').find({}, { projection: { _id: 0, longName: 0, public: 0 } }).toArray((err, data) => {
      if (err) {
        console.error(err)
        socket.emit(EVENT, 'Error retrieving data')
        return
      }
      socket.emit(EVENT, data)
    })
  })

  // Send client min prices for given date range and route
  socket.on('fetchCalendarPrices', (data, respond) => {
    // data should be: {start: Date, end: Date, origin: 'AIR', destination: 'AIR'}
    if (!db) {
      respond('Could not connect to database')
      return
    }
    db.collection('flights').find({}, {}).toArray((err, data) => {
      if (err) {
        console.error(err)
        respond('Error retrieving data')
        return
      }
      respond(data)
    })
  })

  socket.on('flightSearch', (req) => {
    const EVENT = 'flightSearch'
    const TIMEZONE_OFFSETT = -300 // In minutes
    req.date = addMins(new Date(req.date), TIMEZONE_OFFSETT)
    // Search for direct routes
    db.collection('flights').find(
      // origin && destination && date
      {
        origin: { $eq: req.origin },
        destination: { $eq: req.destination },
        'schedule.departure': { $gte: req.date, $lte: addDays(req.date, 1) }
      },
      { _id: 0, public: 0 }
    ).toArray((err, data) => {
      if (err) {
        console.error(err)
        socket.emit(EVENT, ['direct', 'Error retrieving data'])
        return
      }
      socket.emit(EVENT, ['direct', data])
    })

    // Search for one-stop trips:
    socket.emit(EVENT, ['oneStopHubs', searchOneStop(req, true, false)])
    // socket.emit(EVENT, ['oneStopFocus', searchOneStop(req, false, true)])
    // socket.emit(EVENT, ['oneStopAll', searchOneStop(req, false, false)])
  })
})

io.listen(3000)

// DATABASE //
const MongoClient = require('mongodb').MongoClient
const secrets = require('./secrets')
const airports = []

// const dbConnected = false
// const uri = `mongodb+srv://${secrets.db.username}:${secrets.db.password}@cluster0.uqwlq.mongodb.net/${secrets.db.name}?retryWrites=true&w=majority`
const uri = `mongodb://${secrets.db.username}:${secrets.db.password}@localhost:27017/?authSource=${secrets.db.authDb}`
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true })
let db = false
client.connect(() => {
  db = client.db('airline')
})
