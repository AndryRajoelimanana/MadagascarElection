from flask import Flask, render_template
import os, json
app = Flask(__name__)

@app.route('/')
def index():
    return render_template("index.html")
    
@app.route('/hvm.html')
def main():
    return render_template('hvm.html')    
    

if __name__ == '__main__':
    app.run(debug=True, threaded = True)
