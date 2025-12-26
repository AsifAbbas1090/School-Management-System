/**
 * Major subjects for intermediate level (till intermediate)
 * Used for autocomplete in marks entry
 */
export const MAJOR_SUBJECTS = [
    'English',
    'Urdu',
    'Mathematics',
    'Physics',
    'Chemistry',
    'Biology',
    'Computer Science',
    'Islamiat',
    'Pakistan Studies',
    'Economics',
    'Accounting',
    'Business Studies',
    'Statistics',
    'Psychology',
    'Sociology',
    'History',
    'Geography',
    'Islamic Studies',
    'Arabic',
    'General Science',
    'Arts',
    'Drawing',
    'Physical Education',
    'Home Economics',
    'Civics',
    'Literature',
    'Philosophy',
    'Political Science',
    'Commerce',
    'Banking',
    'Marketing',
    'Finance',
    'Management',
    'Information Technology',
    'Programming',
    'Database',
    'Networking',
    'Web Development',
    'Software Engineering',
    'Data Science',
    'Artificial Intelligence',
    'Machine Learning',
    'Cybersecurity',
    'Digital Marketing',
    'Graphic Design',
    'Multimedia',
    'Animation',
    'Music',
    'Drama',
    'Theater',
    'Dance',
    'Sports',
    'Health Education',
    'Environmental Science',
    'Agriculture',
    'Veterinary Science',
    'Medical',
    'Engineering',
    'Architecture',
    'Law',
    'Journalism',
    'Mass Communication',
    'Media Studies',
    'Film Studies',
    'Photography',
    'Fashion Design',
    'Textile Design',
    'Interior Design',
    'Fine Arts',
    'Sculpture',
    'Painting',
    'Calligraphy',
    'Languages',
    'French',
    'German',
    'Spanish',
    'Chinese',
    'Japanese',
    'Turkish',
    'Persian',
    'Hindi',
    'Bengali',
    'Punjabi',
    'Sindhi',
    'Pashto',
    'Balochi',
    'Kashmiri',
    'Saraiki',
    'Hindko',
    'Brahui',
    'Other'
];

/**
 * Filter subjects based on search term
 * @param {string} searchTerm - Search term
 * @returns {string[]} Filtered subjects
 */
export const filterSubjects = (searchTerm) => {
    if (!searchTerm || searchTerm.trim() === '') {
        return MAJOR_SUBJECTS.slice(0, 10); // Show first 10 by default
    }
    
    const term = searchTerm.toLowerCase().trim();
    return MAJOR_SUBJECTS.filter(subject => 
        subject.toLowerCase().includes(term)
    ).slice(0, 10); // Limit to 10 results
};

