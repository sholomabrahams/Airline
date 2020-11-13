<template>
  <div class="container">
    <div class="row">
      <v-form @submit.prevent="findOutboundFlights">
        <v-autocomplete
          v-model="origin"
          :loading="loading"
          :items="airports"
          :item-text="airportString"
          clearable
          cache-items
          class="mx-4 d-inline-block"
          hide-no-data
          hide-details
          label="Origin"
          solo
        />
        <v-autocomplete
          v-model="destination"
          :loading="loading"
          :items="airports"
          :item-text="airportString"
          clearable
          cache-items
          class="mx-4 d-inline-block"
          hide-no-data
          hide-details
          label="Destination"
          solo
        />
        <input
          v-model="departureDate"
          type="date"
        >
        <input
          v-model="returnDate"
          type="date"
        >
        <v-btn type="submit">
          Search
        </v-btn>
      </v-form>
    </div>
  </div>
</template>

<style scoped>

</style>

<script>
import COUNTRIES from '../constants/countries'

export default {
  name: 'Map',

  data: () => ({
    loading: true,
    airports: [],
    origin: null,
    destination: null,
    departureDate: '2020-11-07',
    returnDate: '2020-11-22'
    // searchStart: null
  }),

  sockets: {
    connect: function () {
      console.log('Successfully connected to server')
    },
    fetchAirports: function (data) {
      // console.log(data)
      if (typeof data === 'string') return
      this.loading = false
      this.airports = data
    },
    flightSearch: function (data) {
      console.log(data)
    }
  },

  mounted () {
    this.$socket.emit('fetchAirports')
  },

  methods: {
    airportString (v) {
      if (v.single) {
        return `${v.code} - ${v.shortName} (${v.city}, ${v.state ? v.state + ', ' : ''} ${COUNTRIES[v.country].name})`
      }
      return `${v.city}, ${v.state ? v.state + ', ' : ''} ${COUNTRIES[v.country].name} - All Airports (${v.code})`
    },
    findOutboundFlights () {
      console.log('starting search')
      this.$socket.emit('flightSearch', { origin: this.origin.substr(0, 3), destination: this.destination.substr(0, 3), date: this.departureDate })
      // this.searchStart = new Date()
    }
  }
}
</script>
