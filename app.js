'use strict';
/* global $*/

/**
 * Stores the Session Token for API Calls
 */
let SESSION_TOKEN = undefined;

/**
 * An object for relaying error information.
 */
const ERROR = {
  error: null,
  message: null,
};

/**
 * Contains the Configuration options for the API
 */
const API_CONFIG = {
  base_url: 'https://opentdb.com',
  paths: {
    token_url: '/api_token.php', 
    category_url: '/api_category.php',
    question_url: '/api.php'
  }
};

/**
 * Returns a URL object based on the type passed in.
 * Valid optiosn include: 'token', 'category' and 'question'
 * @param {string} type 
 */
const buildURL = function(type){
  let url = new URL(API_CONFIG.base_url);
  switch(type){
  case 'token':
    url.pathname=API_CONFIG.paths.token_url;
    url.searchParams.set('command','request');
    return url;      
  case 'category':
    url.pathname=API_CONFIG.paths.category_url;
    return url;
  case 'question':
    url.pathname=API_CONFIG.paths.question_url;
    url.searchParams.set('type','multiple');
    url.searchParams.set('amount', '1');
    url.searchParams.set('category', QUIZ_OPTIONS.category);
    url.searchParams.set('difficulty', QUIZ_OPTIONS.difficulty);
    url.searchParams.set('token', SESSION_TOKEN);
    return url;
  }
};

/**
 * Options for the Current Quiz Game
 */
const QUIZ_OPTIONS = {
  category: 11,
  difficulty: 'easy',
  questions: 10,
};

/**
 * Sets the global SESSION_TOKEN from the `fetchToken()` response 
 * @param {object} response 
 */
const setSessionToken = function(response){
  try {
    SESSION_TOKEN = response.token;
  } catch (error) {
    ERROR.error = error.message;
    ERROR.message = 'There was an error starting a new quiz session.';
  }
};

/**
 * Retrieves the Categories from the API
 * @callback callback
 */
const getCategories = function(callback){

  $.getJSON(buildURL('category'), callback);
};

/**
 * Generate the Categories HTML option elements from the API call
 * should be used as a callback to `getCategories()`
 * @param {object} response 
 */
const generateCategoriesHtml = function(response){
  let html = '';
  response.trivia_categories.forEach( c => html +=`<option id="${c.id}">${c.name}</option>`);
  $('.js-category').append(html);
};

/**
 * This function is the initial function that runs after we receive the Session Token
 * and should be the callback for `fetchToken()`
 */
const start = function(){
  $('.js-start').removeAttr('disabled');
  $('.js-category').removeAttr('disabled');
  $('.js-total-questions').removeAttr('disabled');
  $('.js-difficulty').removeAttr('disabled');
  
  $('.js-category').change(function(){
    setCategory();
  });

  $('.js-total-questions').change(function(){
    setSelectedNumberOfQuestions();
  });

  $('.js-difficulty').change(function(){
    setDifficulty();
  });

  render();
 
  $('.js-intro, .js-outro').on('click', '.js-start', handleStartQuiz);
  
  $('.js-question').on('submit', handleSubmitAnswer);
  $('.js-question-feedback').on('click', '.js-continue', handleNextQuestion);
};

/**
 * Fetch a Token using the `buildTokenUrl()` method 
 * @callback callback
 */
const fetchToken = function(callback){
  $.getJSON(buildURL('token'), callback);
};

/**
 * Fetch a single question from the Open Trivia db 
 * @callback callback
 */
const fetchQuestion = function(callback){
  $.getJSON(buildURL('question'), function(response){
    try {
      const question= response.results[0];
      const decoratedQuestion = decorateQuestion(question);
      addQuestion(decoratedQuestion);
      callback();
    } catch (error) {
      ERROR.error = error.message;
      ERROR.message = 'There was an error retrieving the next question';
    }
  });
};

/**
 * Decorate the question object from the response from `fetchQuestion()` 
 * so that it fits the QUESTIONS object layout
 * 
 * @param {object} receives a question object from 
 * @returns {object} 
 */
const decorateQuestion = function(question){
  return {
    text: question.question,
    answers: [...question.incorrect_answers, question.correct_answer],
    correctAnswer: question.correct_answer 
  };
};

/**
 * Adds a decorated question to the store
 * @param {object} a `decorateQuestion()` response object
 */
const addQuestion = function(questionObject){
  QUESTIONS.push(questionObject);
};

const TOP_LEVEL_COMPONENTS = [
  'js-intro', 'js-question', 'js-question-feedback', 'js-outro', 'js-quiz-status'
];

const QUESTIONS = [];

const getInitialStore = function() {  
  return {
    page: 'intro',
    currentQuestionIndex: null,
    userAnswers: [],
    feedback: null
  };
};

let store = getInitialStore();

// Helper functions
// ===============

/**
 * Returns the Category Id that the user selected in the DOM
 * @returns {number}
 */
const getSelectedCategoryId = function(){
  return $('.js-category option:selected').attr('id');
};

/**
 * 
 */
const setCategory = function(){
  QUIZ_OPTIONS.category = getSelectedCategoryId();
};

/**
 * Returns the Difficulty value that the user selected in the DOM
 * @returns {string}
 */
const getSelectedDifficulty = function(){
  return $('.js-difficulty').val().toLowerCase();
};

const setDifficulty = function(){
  QUIZ_OPTIONS.difficulty = getSelectedDifficulty();
};

/**
 * Returns the Number of Questions the user selected in the DOM
 * @returns {number}
 */
const getSelectedNumberOfQuestions = function(){
  return $('.js-total-questions').val();
};

const setSelectedNumberOfQuestions = function(){
  QUIZ_OPTIONS.questions = getSelectedNumberOfQuestions();
};

const hideAll = function() {
  TOP_LEVEL_COMPONENTS.forEach(component => $(`.${component}`).hide());
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

const getProgress = function() {
  return {
    current: store.currentQuestionIndex + 1,
    total: QUIZ_OPTIONS.questions
  };
};

const getCurrentQuestion = function() {
  return QUESTIONS[store.currentQuestionIndex];
};

const getQuestion = function(index) {
  return QUESTIONS[index];
};

// HTML generator functions
// ========================

const generateAnswerItemHtml = function(answer) {
  return `
    <li class="answer-item">
      <input type="radio" name="answers" value="${answer}" />
      <span class="answer-text">${answer}</span>
    </li>
  `;
};

const generateQuestionHtml = function(question) {
  const answers = question.answers
    .map((answer, index) => generateAnswerItemHtml(answer, index))
    .join('');

  return `
    <form>
      <fieldset>
        <legend class="question-text">${question.text}</legend>
          ${answers}
          <button type="submit">Submit</button>
      </fieldset>
    </form>
  `;
};

const generateFeedbackHtml = function(feedback) {
  return `
    <p>${feedback}</p>
    <button class="continue js-continue">Continue</button>
  `;
};

// Render function - uses `store` object to construct entire page every time it's run
// ===============
const render = function() {
  let html;
  hideAll();

  const question = getCurrentQuestion();
  const { feedback } = store;
  const { current, total } = getProgress();

  $('.js-score').html(`<span>Score: ${getScore()}</span>`);
  $('.js-progress').html(`<span>Question ${current} of ${total}`);

  switch (store.page) {
  case 'intro':
    $('.js-intro').show();
    break;

  case 'question':
    html = generateQuestionHtml(question);
    $('.js-question').html(html);
    $('.js-question').show();
    $('.quiz-status').show();
    break;

  case 'answer':
    html = generateFeedbackHtml(feedback);
    $('.js-question-feedback').html(html);
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
};

// Event handler functions
// =======================
const handleStartQuiz = function() {
  fetchQuestion(function(){
    store = getInitialStore();
    store.page = 'question';
    store.currentQuestionIndex = 0;
    render();
  });
};

const handleSubmitAnswer = function(e) {
  e.preventDefault();
  const question = getCurrentQuestion();
  const selected = $('input:checked').val();
  store.userAnswers.push(selected);

  if (selected === question.correctAnswer) {
    store.feedback = 'You got it!';
  } else {
    store.feedback = `Too bad! The correct answer was: ${question.correctAnswer}`;
  }

  store.page = 'answer';
  render();
};

const handleNextQuestion = function() {
  if (store.currentQuestionIndex === QUIZ_OPTIONS.questions -1) {
    // we reached the end  
    fetchToken(function(response){
      QUESTIONS.length=0;
      store = getInitialStore();
      setSessionToken(response);
      store.page = 'outro';
      render();
    });
    return;
  }

  store.currentQuestionIndex++;
  fetchQuestion(function(){
    store.page = 'question';
    render();
  });
};

// On DOM Ready fetches a session token and calls `start` which renders and sets handlers 
$(() => {
  fetchToken(function(response){
    setSessionToken(response);
    getCategories(generateCategoriesHtml);
    start();
  });
});
