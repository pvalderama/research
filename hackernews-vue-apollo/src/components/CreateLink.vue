<template>
  <div>
    <div class="flex flex-column mt3">
      <input
        class="mb2"
        v-model="description"
        type="text"
        placeholder="A description for the link">
      <input
        class="mb2"
        v-model="url"
        type="text"
        placeholder="The URL for the link">
    </div>
    <button @click="createLink()">Submit</button>
  </div>
</template>

<script>
import { ALL_LINKS_QUERY, CREATE_LINK_MUTATION } from '../constants/graphql.js'
import { GC_USER_ID } from '../constants/settings'
import ApolloDev from '../utils/TimeTravel.js'

export default {
  name: 'CreateLink',
  data () {
    return {
      description: '',
      url: ''
    }
  },
  methods: {
    createLink () {
      const postedById = localStorage.getItem(GC_USER_ID)
      if (!postedById) {
        console.error('No user logged in')
        return
      }

      const newDescription = this.description
      const newUrl = this.url
      this.description = ''
      this.url = ''

      this.ApolloDev = ApolloDev.bind(this)
      this.ApolloDev({
        mutation: CREATE_LINK_MUTATION,
        variables: {
          description: newDescription,
          url: newUrl,
          postedById
        },
        update: (store, { data: { createLink } }) => {
          const data = store.readQuery({ query: ALL_LINKS_QUERY })
          data.allLinks.push(createLink)
          store.writeQuery({ query: ALL_LINKS_QUERY, data })
        }
      }).then((data) => {
        console.log('promise data: ', data)
        this.$router.push({path: '/'})
      }).catch((error) => {
        console.error(error)
        this.newDescription = newDescription
        this.newUrl = newUrl
      })
    }
  }
}
</script>
