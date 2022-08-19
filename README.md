This extension allows you to define a banner image to use as a header on an individual page level.

Simply create a block anywhere on the page in the form:

banner: url

where url is a link to a web image.

The extension will scan each page as you navigate to it, and if it finds a banner: url definition somewhere on the page it will create the banner.

Banner height is configurable in Roam Depot settings, but defaults to 150px.

![banner-headers](https://user-images.githubusercontent.com/6857790/185397164-6e260dc9-25f4-4c60-b579-3dffffa5c196.gif)

You can also add a banner to a page from your clipboard. Simply find the url of an image you wish to use, copy it, and then on the Roam Research page trigger Set Banner from Clipboard via Command Palette (CTRL-p). This will create a banner: url entry at the bottom of the page, and trigger the page to load the banner to the header.

You can apply a gradient to the bottom of the banner to soften the image on the page, by turning the switch on in the Roam Depot settings page.
