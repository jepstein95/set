module.exports = function(grunt) {

  grunt.initConfig({
    jshint: {
      files: ['public/javascripts/*']
    },
    compass: {
      dist: {
        options: {
          sassDir: 'public/stylesheets/sass',
          cssDir: 'public/stylesheets'
        }
      }
    },
    handlebars: {
      options: {
        amd: true,
        processName: function(path) {
          return path.replace(/^public\/templates\//, '').replace(/\.hbs$/, '');
        }
      },
      all: {
        files: {
          'public/javascripts/templates.js': ['public/templates/**/*.hbs']
        }
      }
    },
    exec: {
      app: {
        cmd: 'node app.js'
      }  
    }
  });

  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-compass');
  grunt.loadNpmTasks('grunt-contrib-handlebars');
  grunt.loadNpmTasks('grunt-exec');

  grunt.registerTask('default', ['compass', 'handlebars', 'exec']);

};
