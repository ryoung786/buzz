#!/usr/bin/python

import urllib2, re
from BeautifulSoup import BeautifulSoup
from pymongo.connection import Connection

x = urllib2.urlopen('http://www.j-archive.com/showgame.php?game_id=3622')
soup = BeautifulSoup(x.read())
questions = [i.string for i in soup.findAll('td', 'clue_text')]

mouse_overs = [i.parent['onmouseover'] for i in soup.findAll('table', 'clue_header')]
answers = []
for i in mouse_overs:
    soup2 = BeautifulSoup(i.split("', '")[2])
    answers.append(soup2.findAll('em')[0].string)

connection = Connection("localhost")
 
db = connection.buzz

for i in range(len(answers)):
    if (questions[i] and answers[i]):
        doc = {"question": questions[i],
               "answer": answers[i] }
        db.questions.save(doc)
