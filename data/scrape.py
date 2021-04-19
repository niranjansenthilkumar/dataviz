from bs4 import BeautifulSoup as bs
import numpy as np
import json
from datetime import datetime
from dateutil import parser
import re

file = open("timeline.html")
soup = bs(file, 'html.parser')

body = soup.find("div", {"class":"story-body"})
print(len(body.findAll("p")))
events = body.findAll('p')
events_dict = []

# for every possible event
for e in events: 
    if(e.find("strong") != None): # if not a timeline entry
        date = str(e.find("strong").string)
        try:
            date = (re.sub("![0-0]", "", date)) #year of event
            month = e.contents[1].split(" - ")[0].strip()
            headline = e.contents[1].split(" - ")[1].strip()

            #if gives a range of months, give the first month
            if("-" in month): 
                month = month.split("-")[0]

            d = parser.parse("1 " + month + " " + date)
            comp = parser.parse("2000")

            # take only events in the range of the kaggle data
            if d > comp:
                events_dict.append({"date":str(d), "headline":headline})

        # will fail if the element e isn't a valid timeline entry
        except Exception as ex:
            pass

print(events_dict)
print("number of dates", len(events_dict))

with open("headlines.json", 'w') as file: 
    json.dump(events_dict, file, indent=4)