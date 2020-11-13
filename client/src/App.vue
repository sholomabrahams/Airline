<template>
  <v-app>
    <v-app-bar app>
      <v-app-bar-nav-icon
        class="d-md-none"
        @click="sideNav = !sideNav"
      />

      <router-link to="/">
        Home
      </router-link>
      <router-link to="/about">
        About
      </router-link>
    </v-app-bar>
    <transition
      name="fade"
      mode="out-in"
    >
      <v-main>
        <router-view />
      </v-main>
    </transition>
  </v-app>
</template>

<style lang="scss">
.fade-enter-active,
.fade-leave-active {
  transition-duration: 0.3s;
  transition-property: opacity;
  transition-timing-function: ease;
}

.fade-enter,
.fade-leave-active {
  opacity: 0
}
</style>

<script>
export default {
  name: 'App',

  data: () => ({
    sideNav: false
  })
}
</script>
