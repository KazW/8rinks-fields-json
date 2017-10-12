const ApiBuilder = require('claudia-api-builder'),
  api = new ApiBuilder(),
  moment = require('moment-timezone'),
  fetch = require('node-fetch')

module.exports = api

api.get('/field-schedule', function (request) {
  return fetch('https://www.icesports.com/BURNABY8RINKS/book-field.aspx', {timeout: 5000})
    .then(function(res) {
      return res.text()
    }).then(function(body) {
      const currentDate = moment().tz('America/Vancouver')
      const data        = []
      const wrapper     = '#ctl00_mainContent_ctl01_RepProgramDescriptions_ctl00_divFacilityProgramAll'
      const cheerio     = require('cheerio')
      const $           = cheerio.load(body)
      const rows        = $(wrapper).find('table').find('tr')

      rows.each(function(i, row){
        row = parseRow($, this, currentDate)
        if (currentDate.isBefore(row.startTime)) {
          data.push(row)
        }
      })

      return data
    }).catch(function(err) {
      console.log(`Got error: ${err}`)
      return null
    })
})

function parseRow($, row, currentDate) {
  var day, field, price, available, date, time

  $(row).find('.reg-padding_ice').each(function(i, cell) {
    var header = $(this).find('.ice-title-col-title').text().trim().toLowerCase()
    if (header == ''){
      header = $(this).text().trim().toLowerCase()
    }

    if (header == 'date') {
      date = getCellValue($, this)
    } else if (header == 'time'){
      time = getCellValue($, this)
    } else if (header == 'days'){
      day = getCellValue($, this)
    } else if (header == 'field'){
      field = getCellValue($, this)
    } else if (header == 'price'){
      price = getCellValue($, this)
    } else if (header == 'reserve'){
      available = true
    } else if (header == 'booked'){
      available = false
    }
  })

  date = getDates(date, time, currentDate)

  return {
    startTime: date[0],
    endTime: date[1],
    day: day,
    field: field,
    price: price,
    available: available
  }
}

function getCellValue($, cell) {
  return $(cell).find('.ice-title-col').text().trim()
}

function getDates(date, time, currentDate) {
  var month, day, year, start, startTime, endTime
  year = currentDate.year()
  month = date.split(' ')[0]
  day = parseInt(date.split(' ')[1])
  start = time.split('-')[0].trim()

  if (moment(`${month} 1 12:00, ${year}`, 'MMM D HH:MM, YYYY').month() < currentDate.month() - 1) {
    year += 1
  }

  startTime = moment.tz(`${month} ${day} ${start}, ${year}`, 'MMM D hh:mm a, YYYY', 'America/Vancouver')
  endTime   = moment(startTime.format()).add(1, 'hour').tz('America/Vancouver')

  return [startTime.format(), endTime.format()]
}
