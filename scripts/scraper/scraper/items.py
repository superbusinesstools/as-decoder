import scrapy

class ScrapedPageItem(scrapy.Item):
    url = scrapy.Field()
    path = scrapy.Field() 
    content = scrapy.Field()
    depth = scrapy.Field()
    emails = scrapy.Field()
    title = scrapy.Field()