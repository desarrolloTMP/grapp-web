interface FileRestrictions {
  allowedExtensions: string[];
  maxFileSize: number;
  minFileSize: number;
}

export const FileRestrictions: FileRestrictions = {
  // allowedExtensions: [
  //   'xlsx', 'xlsm', 'xltx', 'xltm', 'xls', 'xlt', 'xml', 'xlam', 'xlw',
  //   'docx', 'doc', 'dotx', 'dot', 'txt', 'docm', 'pptx', 'ppsx',
  //   'ppt', 'pps', 'pdf', 'jpg', 'png'
  // ],
  allowedExtensions: [
    'pdf', 'jpg', 'png', 'jpeg', 'tiff', 'tif'
  ],
  maxFileSize: 30000000, // 100 MB
  minFileSize: 1,
};
