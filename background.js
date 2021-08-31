/*
 * In the future we'll want to update this such that it loads the specific values from
 * a JSON file that stores data for different types of [domain regex : xpath] pairings.
 */
let color = '#3aa757';

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.set({ color });
  console.log('Default background color set to %cgreen', `color: ${color}`);
});
