import { Component, OnInit /*, ElementRef, ViewChild */ } from '@angular/core';

// import 'vtk.js/Sources/favicon';

// import vtkFullScreenRenderWindow from 'vtk.js/Sources/Rendering/Misc/FullScreenRenderWindow';
// import vtkHttpDataSetReader from 'vtk.js/Sources/IO/Core/HttpDataSetReader';
// import vtkImageMapper from 'vtk.js/Sources/Rendering/Core/ImageMapper';
// import vtkImageSlice from 'vtk.js/Sources/Rendering/Core/ImageSlice';

@Component({
  selector: 'app-volviewer',
  templateUrl: './volviewer.component.html',
  styleUrls: ['./volviewer.component.scss']
})
export class VolviewerComponent implements OnInit {
    /* @ViewChild('volViewerControlDiv') private viewerDivElem: ElementRef;
    public fullScreen;
    public imageActorI;
    public imageActorJ;
    public imageActorK;
    public renderWindow;

    updateColorWindow(e) {
      const colorLevel = Number(
        (e ? e.target : document.querySelector('.colorWindow')).value
      );
      this.imageActorI.getProperty().setColorWindow(colorLevel);
      this.imageActorJ.getProperty().setColorWindow(colorLevel);
      this.imageActorK.getProperty().setColorWindow(colorLevel);
      this.renderWindow.render();
    }

    updateColorLevel(e) {
      const colorLevel = Number(
        (e ? e.target : document.querySelector('.colorLevel')).value
      );
      this.imageActorI.getProperty().setColorLevel(colorLevel);
      this.imageActorJ.getProperty().setColorLevel(colorLevel);
      this.imageActorK.getProperty().setColorLevel(colorLevel);
      this.renderWindow.render();
  }*/

  constructor() {
      /*const fullScreenRenderWindow = vtkFullScreenRenderWindow.newInstance({
        background: [0, 0, 0],
      });
      const renderWindow = fullScreenRenderWindow.getRenderWindow();
      const renderer = fullScreenRenderWindow.getRenderer();
      fullScreenRenderWindow.addController(this.viewerDivElem.nativeElement);

      const imageActorI = vtkImageSlice.newInstance();
      const imageActorJ = vtkImageSlice.newInstance();
      const imageActorK = vtkImageSlice.newInstance();

      renderer.addActor(imageActorK);
      renderer.addActor(imageActorJ);
      renderer.addActor(imageActorI);

      const reader = vtkHttpDataSetReader.newInstance({
        fetchGzip: true,
      });
      reader
        .setUrl('data/volume/headsq.vti', { loadData: true })
        .then(() => {
          const data = reader.getOutputData();
          const dataRange = data
            .getPointData()
            .getScalars()
            .getRange();
          const extent = data.getExtent();

          const imageMapperK = vtkImageMapper.newInstance();
          imageMapperK.setInputData(data);
          imageMapperK.setKSlice(30);
          imageActorK.setMapper(imageMapperK);

          const imageMapperJ = vtkImageMapper.newInstance();
          imageMapperJ.setInputData(data);
          imageMapperJ.setJSlice(30);
          imageActorJ.setMapper(imageMapperJ);

          const imageMapperI = vtkImageMapper.newInstance();
          imageMapperI.setInputData(data);
          imageMapperI.setISlice(30);
          imageActorI.setMapper(imageMapperI);

          renderer.resetCamera();
          renderer.resetCameraClippingRange();
          renderWindow.render();

          ['.sliceI', '.sliceJ', '.sliceK'].forEach((selector, idx) => {
            const el = document.querySelector(selector);
            el.setAttribute('min', extent[idx * 2 + 0]);
            el.setAttribute('max', extent[idx * 2 + 1]);
            el.setAttribute('value', '30'); // was 30
          });

          ['.colorLevel', '.colorWindow'].forEach((selector) => {
            document.querySelector(selector).setAttribute('max', dataRange[1]);
            document.querySelector(selector).setAttribute('value', dataRange[1]);
          });
          const avRange = (dataRange[0] + dataRange[1]) / 2;
          document
            .querySelector('.colorLevel')
            .setAttribute('value', avRange.toString() );
          this.updateColorLevel(null);
          this.updateColorWindow(null);
        });

      document.querySelector('.sliceI').addEventListener('input', (e) => {
        this.imageActorI.getMapper().setISlice(Number(e.target));  // was e.target.value
        renderWindow.render();
      });

      document.querySelector('.sliceJ').addEventListener('input', (e) => {
        this.imageActorJ.getMapper().setJSlice(Number(e.target)); // was e.target.value
        renderWindow.render();
      });

      document.querySelector('.sliceK').addEventListener('input', (e) => {
        this.imageActorK.getMapper().setKSlice(Number(e.target)); // was e.target.value
        renderWindow.render();
      });

      document
        .querySelector('.colorLevel')
        .addEventListener('input', this.updateColorLevel);
      document
        .querySelector('.colorWindow')
        .addEventListener('input', this.updateColorWindow);*/

   }

  ngOnInit() {
  }

}
