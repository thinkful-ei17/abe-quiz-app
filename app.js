'use strict';
/* global $*/

/**
 * TriviaApi
 */
class TriviaApi {
  constructor() {
    this._sessionToken = '';
  }

  /**
   * Get the current Session Token
   */
  getNewSessionToken(callback) {
    this._fetchToken(callback);
  }

  /**
   * Fetch a new Token from the Open Trivia Database API
   */
  _fetchToken(callback) {
    $.getJSON(
      'https://opentdb.com/api_token.php?command=request',
      e => (this._sessionToken = e.token)
    );
    if (!(callback === undefined)) callback();
  }

  /**
   * Get session 
   */
  getSessionToken() {
    return this._sessionToken;
  }

  /**
   * 
   * @callback callback 
   */
  getCategories(callback) {
    try {
      $.getJSON('https://opentdb.com/api_category.php', callback);
    } catch (error){
      throw new Error('Error retrieving categories: ${error.message}');
    }
  }

  _fetchQuestion(callback) {
    const url = new URL('https://opentdb.com');
    url.pathname = '/api.php';
    url.searchParams.set('type', 'multiple');
    url.searchParams.set('amount', '1');
    url.searchParams.set('category', store.quizCategory);
    url.searchParams.set('difficulty', store.difficulty);
    url.searchParams.set('token', this.getSessionToken());
    const decorate = this._decorateQuestion;
    const cb = callback;
    $.getJSON(url, function(response){
      try {
        const question = response.results[0];
        const decoratedQuestion = decorate(question);
        store.questions.push(decoratedQuestion);
        cb();
      } catch (error) {
        throw new Error(`there was an error retrieving the next question: ${error.message}`);
      }
    });
  }

  /**
   * 
   * @param {object} question 
   */
  _decorateQuestion(question) {
    return {
      text: question.question,
      answers: [...question.incorrect_answers, question.correct_answer],
      correctAnswer: question.correct_answer
    };
  }

  /**
   * 
   * @callback callback
   */
  getNewQuestion(callback){
    this._fetchQuestion(callback);
  }
}
class Store{
  constructor(){
    this.page = 'intro';
    this.currentQuestionIndex = null;
    this.userAnswers = [];
    this.feedback = null;
    this.quizCategory = 9;
    this.difficulty = null;
    this.numberOfQuestions = null;
    this.questions = [];
  }

  NewGame(){
    this._resetStore();
  }

  _resetStore(){
    this.page = 'intro';
    this.currentQuestionIndex = null;
    this.userAnswers = [];
    this.feedback = null;
    this.quizCategory = 9; // Default to `General Knowledge`
    this.difficulty = null;
    this.numberOfQuestions = null;
    this.questions = [];
  }
}

class Render{
  constructor(){
    this.html = '';
    this._top_level_compnents = [
      'js-intro',
      'js-question',
      'js-question-feedback',
      'js-outro',
      'js-quiz-status'
    ];
    this._hideAll();
    this.question='';
    this.feedback='';
    this.current='';
    this.total='';
  }

  _hideAll(){
    this._top_level_compnents.forEach(c => $(`.${c}`).hide());
  }

  render(){
    this._hideAll();
    this.question = this._getCurrentQuestion();
    this.feedback = store.feedback;
    let progress =  this._getProgress();
    this.current= progress.current;
    this.total = progress.total;
    $('.js-score').html(`<span>Score: ${getScore()}</span>`);
    $('.js-progress').html(`<span>Question ${this.current} of ${this.total}`);

    switch (store.page) {
    case 'intro':
      $('.js-intro').show();
      break;

    case 'question':
      this.html = generateQuestionHtml(this.question);
      $('.js-question').html(this.html);
      $('.js-question').show();
      $('.quiz-status').show();
      break;

    case 'answer':
      this.html = generateFeedbackHtml(this.feedback);
      $('.js-question-feedback').html(this.html);
      $('.js-question-feedback').show();
      $('.quiz-status').show();
      break;

    case 'outro':
      $('.js-outro').show();
      $('.quiz-status').show();
      break;

    default:
      return;
    }
  }

  _getCurrentQuestion(){
    return store.currentQuestionIndex;
  }  

  _getProgress(){
    return {
      current: store.currentQuestionIndex+1,
      total: store.numberOfQuestions
    };
  }

}

const store = new Store();
const trivia = new TriviaApi(store);
const render = new Render();

/**
 * Generate the Categories HTML option elements from the API call
 * should be used as a callback to `getCategories()`
 * @param {object} response
 */
const generateCategoriesHtml = function(response) {
  let html = '';
  response.trivia_categories.forEach(
    c => (html += `<option id='${c.id}'>${c.name}</option>`)
  );
  $('.js-category').append(html);
};

/**
 * This function is the initial function that runs after we receive the Session Token
 * and should be the callback for `fetchToken()`
 */
const start = function() {
  $('.js-start').removeAttr('disabled');
  $('.js-category').removeAttr('disabled');
  $('.js-total-questions').removeAttr('disabled');
  $('.js-difficulty').removeAttr('disabled');

  $('.js-category').change(function() {
    setCategory();
  });

  $('.js-total-questions').change(function() {
    setSelectedNumberOfQuestions();
  });

  $('.js-difficulty').change(function() {
    setDifficulty();
  });

  render.render();

  $('.js-intro, .js-outro').on('click', '.js-start',handleStartQuiz);

  $('.js-question').on('submit', handleSubmitAnswer);
  $('.js-question-feedback').on('click', '.js-continue', handleNextQuestion);
};


// Helper functions
// ===============

/**
 * Returns the Category Id that the user selected in the DOM
 * @returns {number}
 */
const getSelectedCategoryId = function() {
  return $('.js-category option:selected').attr('id');
};

/**
 *
 */
const setCategory = function() {
  store.quizCategory = getSelectedCategoryId();
};

/**
 * Returns the Difficulty value that the user selected in the DOM
 * @returns {string}
 */
const getSelectedDifficulty = function() {
  return $('.js-difficulty')
    .val()
    .toLowerCase();
};

const setDifficulty = function() {
  store.difficulty = getSelectedDifficulty();
};

/**
 * Returns the Number of Questions the user selected in the DOM
 * @returns {number}
 */
const getSelectedNumberOfQuestions = function() {
  return $('.js-total-questions').val();
};

const setSelectedNumberOfQuestions = function() {
  store.numberOfQuestions = getSelectedNumberOfQuestions();
};



const getScore = function() {
  return store.userAnswers.reduce((accumulator, userAnswer, index) => {
    const question = getQuestion(index);

    if (question.correctAnswer === userAnswer) {
      return accumulator + 1;
    } else {
      return accumulator;
    }
  }, 0);
};

const getCurrentQuestion = function() {
  return store.currentQuestionIndex;
};

const getQuestion = function(index) {
  return store.questions[index];
};

// HTML generator functions
// ========================

const generateAnswerItemHtml = function(answer) {
  return `
    <li class='answer-item'>
      <input type='radio' name='answers' value='${answer}' />
      <span class='answer-text'>${answer}</span>
    </li>
  `;
};

const generateQuestionHtml = function(question) {
  const answers = store.questions[question].answers
    .map((answer, index) => generateAnswerItemHtml(answer, index))
    .join('');

  return `
    <form>
      <fieldset>
        <legend class='question-text'>${store.questions[question].text}</legend>
          ${answers}
          <button type='submit'>Submit</button>
      </fieldset>
    </form>
  `;
};

const generateFeedbackHtml = function(feedback) {
  return `
    <p>${feedback}</p>
    <button class='continue js-continue'>Continue</button>
  `;
};


// Event handler functions
// =======================
const handleStartQuiz = function() {
  trivia.getNewQuestion(function() {
    store.page = 'question';
    store.currentQuestionIndex = 0;
    render.render();
  });
};

const handleSubmitAnswer = function(e) {
  e.preventDefault();
  const question = getQuestion(getCurrentQuestion());
  const selected = $('input:checked').val();
  store.userAnswers.push(selected);

  if (selected === question.correctAnswer) {
    store.feedback = 'You got it!';
  } else {
    store.feedback = `Too bad! The correct answer was: ${
      question.correctAnswer
    }`;
  }

  store.page = 'answer';
  render.render();
};

const handleNextQuestion = function() {
  if (store.currentQuestionIndex === store.numberOfQuestions - 1) {
    // we reached the end

    trivia.getNewSessionToken(function() {
      store.page = 'outro';
      render.render();
    });
    return;
  }

  store.currentQuestionIndex++;
  trivia.getNewQuestion(function() {
    store.page = 'question';
    render.render();
  });
};



// On DOM Ready fetches a session token and calls `start` which renders and sets handlers
$(() => {
  store.NewGame();
  trivia.getNewSessionToken(function() {
    trivia.getCategories(generateCategoriesHtml);
    setDifficulty();
    setSelectedNumberOfQuestions();
    start();
  });
});
