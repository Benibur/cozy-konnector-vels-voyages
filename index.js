const { BaseKonnector, requestFactory, saveFiles, addData } = require('cozy-konnector-libs')
const request = requestFactory({ cheerio: true, jar:true })
const Promise = require('bluebird')
const fs = require('fs')
const path = require('path')
const requestOri = require('request-promise')
const moment = require('moment')

const BASE_URL = 'http://velsvoyages.com/'

module.exports = new BaseKonnector(start)

function start (fields) {

  /* global variables */
  const albumsData = []

  /* AUTHENTIFICATION */
  return request({
    method: 'POST',
    uri: `${BASE_URL}suivi.php`,
    form: {
      'codesejour': 's2froputeaux',
      'submit': 'Valider'
    }
  })


  /* GET ALBUMS URL */
  .then($ => {
    return request({uri:'http://velsvoyages.com/suivis.php'})
  })
  .then($=>{
    const numberOfAlbums = $('#tiles-wrap').children().length
    const albumsUrl = []
    for (var i = 1; i <= numberOfAlbums; i++) {
      albumsUrl.push('http://velsvoyages.com/suivis.php?article=' + i)
    }
    return albumsUrl
  })


  /* GET IMAGES URL */
  .mapSeries( albumUrl=>{
    return request(albumUrl)
    .then($=>{
      console.log('loop', albumUrl)
      const albumData = {
        date:$($('culturel')[0]).text(),
        title: $($('.testmonial-grid>p')[0]).text(),
        text : trim($($('.gridbig2')).text())
      }
      albumsData.push(albumData)
      console.log(albumData);
      const imagesUrl = []
      $('#bxslider').find('a').each((i,elm)=>{
        const imgUrl = $(elm).attr('href')
        imagesUrl.push(BASE_URL + imgUrl)
      })
      return imagesUrl
    })


    /* GET IMAGES */
    .mapSeries( imgUrl=>{
      const filename = path.basename(imgUrl)
      // 14573-20180227-235830-03285.jpg
      const date = moment(filename.match(/\d+-(\d+)-/)[1],'YYYYMMDD')
      const index = filename.match(/\d+-\d+\.\w+/)
      const localFilename = date.format('YYYY-MM-DD') + ' _' + index
      return requestOri({
        uri:imgUrl,
        encoding:null,
        cheerio:false,
        json:false,
        jar:true,
        resolveWithFullResponse:true
      })
      .then(resp=>{
        fs.writeFileSync('./photo/'+localFilename,resp.body)
      })
    })

    .then(()=>{
      console.log(albumsData);
      const beautify = require('json-beautify')
      const output = beautify(albumsData,null, 2, 80)
      // const output = JSON.stringify(albumsData)
      console.log(output);
      fs.writeFileSync('./photo/'+'Récits de chaque Jour.txt', output )
    })

  })
  .catch(console.log)
}

// helper
function trim(txt) {
  txt = txt.replace(/\n\s+/,'\n')
  txt = txt.replace(/\n+/g,'\n')
  return txt.replace(/\t+/g,'\t')
}
