# matty: fetch MLB gameday data

matty is a command-line tool and Node library for crawling the MLB Gameday web
site.  Both the command-line tool and library are unstable -- they're continuing
to evolve with no intention of maintaining compatibility.

There are a number of other tools for collecting this data, most based on
"hack\_28\_spider.pl".  Matty exists because I found the performance and
robustness wanting in the existing tools.

**matty is not created or approved by MLB.  Crawlers can have a significant
performance impact on servers.  Use responsibly, and at your own risk.**


## Synopsis

    $ matty sample.json
    Loaded configuration.
      year_2013/month_05/day_01/
      year_2013/month_05/day_01/gid_2013_05_01_sfnmlb_arimlb_1/
      ...
    Finished crawl (74 requests, 17042 ms)

All parameters are specified by the JSON file specified by the first argument.


## Configuration

You **must** specify the **start**, **end**, and **output** properties:

* **start**: any timestamp accepted by `Date.parse()` that denotes the first
  day's games you want to start crawling.
* **end**: any timestamp accepted by `Date.parse()` that denotes the last day's
  games you want to start crawling.  (Games on **end** will be included.)
* **output**: root of directory tree in which to store output.

There are a few properties whose defaults are probably fine, but which you may
want to tweak:

* **concurrency**: Number of concurrent connections to use.  **You are strongly
  discouraged from setting concurrency > 1, since this can cause excessive load
  on the server.**
* **file_match**: Array of regular expression patterns to test against filenames
  that would be fetched.  Files fetched must match at least one of these
  expressions.  The default patterns grab basic game summary data and the
  per-inning pitch data.
* **match_all**: Array of regular expression patterns to test against both
  directories and files.  Directories and files not matching *all* of these
  patterns will be skipped.  The default contains no patterns, but this control
  allows you to easily crawl data for only a single team.

If you override these built-in parameters, your top-level value completely
replaces the default.  If you want to add your own "file\_match" patterns and
still use the default ones as well, you need to explicitly specify both your own
and the defaults, since the ones you specify will replace the defaults.

There are a few other properties that you'll likely never need to change:

* **server**: HTTP server where the source data is hosted.
* **root**: Path on the server to start crawling.


## Example

Here's an example file that crawls all SF Giants games from 5/1/2013 to
5/10/2013, putting the output into a directory called "out":

    {
            "start": "2013-05-01",
            "end": "2013-05-01",
            "output": "./out",
            "match_all": [ "_sfnmlb_" ]
    }


## Matty?

The Christian Gentleman, of course.


## TODO

* figure out the right delay between requests
